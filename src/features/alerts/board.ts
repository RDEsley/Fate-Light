import { addDays, daysBetween } from "@/features/mvp/format";
import { addBillingPeriod } from "@/features/mvp/recurrence";

import type { AttentionItem } from "./attention";

export type AlertSource = AttentionItem["source"];
/** Faixas de prazo da central. São uma partição: cada alerta cai em exatamente uma. */
export type AlertBucket = "later" | "overdue" | "week";

/** Mesmos nomes das frequências de cobrança, para as duas agendas falarem a mesma língua. */
export const alertRecurrenceValues = ["none", "weekly", "monthly", "annual"] as const;
export type AlertRecurrence = (typeof alertRecurrenceValues)[number];

export const alertRecurrences: { label: string; value: AlertRecurrence }[] = [
  { label: "Não repetir", value: "none" },
  { label: "Toda semana", value: "weekly" },
  { label: "Todo mês", value: "monthly" },
  { label: "Todo ano", value: "annual" },
];

export function parseAlertRecurrence(value: unknown): AlertRecurrence {
  return alertRecurrenceValues.find((option) => option === value) ?? "none";
}

/** Quantas ocorrências, no máximo, são puladas para um lembrete resolvido com muito atraso. */
const maxSkippedOccurrences = 600;

/**
 * Data da próxima ocorrência de um lembrete que se repete. Conta sempre a partir da data
 * original — "todo dia 31" não vira "todo dia 28" depois de fevereiro — e pula o que já
 * passou: resolver com atraso não pode criar um lembrete que nasce vencido.
 */
export function nextAlertDate(dueOn: string, recurrence: AlertRecurrence, today: string) {
  if (recurrence === "none") return null;
  for (let step = 1; step <= maxSkippedOccurrences; step += 1) {
    const next = addBillingPeriod(dueOn, recurrence, step);
    if (next > today) return next;
  }
  return null;
}

export type AlertRow = {
  bucket: AlertBucket;
  calendarUrl: string;
  /** Cliente a que o lembrete avulso foi vinculado. */
  clientId: string | null;
  date: string;
  deadline: { label: string; tone: "danger" | "neutral" | "warning" };
  href: string;
  id: string;
  /** Identificador do lembrete avulso; ausente nos alertas derivados de outros registros. */
  manualId?: string;
  notes: string | null;
  owner: string | null;
  recurrence: AlertRecurrence;
  source: AlertSource;
  subject: string;
  /** Lembrete marcado como urgente por quem o criou. */
  urgent: boolean;
};

export const alertSources: Record<AlertSource, { label: string; open: string; plural: string }> = {
  adjustment: { label: "Reajuste", open: "Abrir cliente", plural: "Reajustes" },
  charge: { label: "Cobrança", open: "Abrir cobrança", plural: "Cobranças" },
  domain: { label: "Domínio", open: "Abrir domínio", plural: "Domínios" },
  expense: { label: "Despesa", open: "Abrir despesa", plural: "Despesas" },
  manual: { label: "Lembrete", open: "", plural: "Lembretes" },
};

/** Ordem fixa dos tipos nos filtros, independente do que chegou primeiro. */
export const alertSourceOrder: AlertSource[] = [
  "charge",
  "expense",
  "domain",
  "adjustment",
  "manual",
];

export const alertBucketLabels: Record<AlertBucket, string> = {
  later: "Próximos",
  overdue: "Atrasados",
  week: "Esta semana",
};

const bucketRank: Record<AlertBucket, number> = { later: 2, overdue: 0, week: 1 };

/** Vencido antes de hoje é atraso; de hoje até sete dias à frente é "esta semana". */
export function alertBucket(date: string, today: string): AlertBucket {
  if (date < today) return "overdue";
  return date <= addDays(today, 7) ? "week" : "later";
}

/** Prazo em linguagem de calendário: "Há 3 dias", "Hoje", "Amanhã", "Em 12 dias". */
export function alertDeadline(date: string, today: string): AlertRow["deadline"] {
  const days = daysBetween(today, date);
  if (days < 0) return { label: `Há ${-days} ${days === -1 ? "dia" : "dias"}`, tone: "danger" };
  if (days === 0) return { label: "Hoje", tone: "danger" };
  if (days === 1) return { label: "Amanhã", tone: "warning" };
  return { label: `Em ${days} dias`, tone: days <= 7 ? "warning" : "neutral" };
}

export function googleCalendarUrl(title: string, details: string, date: string) {
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${date.replaceAll("-", "")}/${addDays(date, 1).replaceAll("-", "")}`,
    details,
    text: title,
  });
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}

/**
 * Linhas da central, já classificadas por prazo. A ordem é a de quem vai resolver: o
 * atraso mais antigo primeiro e, no mesmo dia, o que foi marcado como urgente antes.
 */
export function toAlertRows(items: AttentionItem[], today: string): AlertRow[] {
  return items
    .map((item) => ({
      bucket: alertBucket(item.date, today),
      calendarUrl: googleCalendarUrl(item.title, item.meta, item.date),
      clientId: item.clientId ?? null,
      date: item.date,
      deadline: alertDeadline(item.date, today),
      href: item.href,
      id: item.id,
      manualId: item.source === "manual" ? item.id.replace("manual-", "") : undefined,
      notes: item.notes ?? null,
      owner: item.owner ?? null,
      recurrence: parseAlertRecurrence(item.recurrence),
      source: item.source,
      subject: item.subject,
      urgent: item.source === "manual" && item.severity === "danger",
    }))
    .sort((left, right) => {
      if (left.bucket !== right.bucket) return bucketRank[left.bucket] - bucketRank[right.bucket];
      if (left.date !== right.date) return left.date < right.date ? -1 : 1;
      if (left.urgent !== right.urgent) return left.urgent ? -1 : 1;
      return left.subject.localeCompare(right.subject, "pt-BR");
    });
}
