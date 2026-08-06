export function formatCurrency(value: number | string | null) {
  const numeric = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(numeric);
}

export function formatDatePtBr(value: string | null | undefined) {
  if (!value) return "Data não informada";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function formatDateTimePtBr(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

export function parseDatePtBr(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

export function isoToday(reference = new Date()) {
  return reference.toISOString().slice(0, 10);
}

export function monthBounds(reference = new Date()) {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  return {
    end: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
    start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
  };
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const hostPattern = /^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?\.[a-z]{2,}$/i;

/** Verdadeiro quando o texto parece um domínio (tem ponto, sem espaço), não só um nome. */
export function looksLikeHost(value: string | null) {
  return Boolean(value && hostPattern.test(value.trim()));
}

export type DashboardPeriod = "30d" | "7d" | "90d" | "all" | "month";

/**
 * Janela de datas do dashboard. `start`/`end` valem para o que foi pago ou gerado no
 * período — não passam de hoje, porque nada é recebido no futuro. `dueEnd` é só para
 * vencimento (cobrança pendente): em "Todo o período" fica sem teto, senão uma cobrança
 * vencendo daqui a meses ficaria de fora mesmo sem nenhum filtro de tempo selecionado —
 * era exatamente isso que fazia "Receita própria pendente" somar cobrança de fora do mês
 * escolhido, já que ela nunca respeitava `start`/`end` antes desta função existir.
 */
export function dashboardPeriodBounds(period: DashboardPeriod, today = isoToday()) {
  const month = monthBounds(new Date(`${today}T00:00:00.000Z`));
  const start =
    period === "all"
      ? "0001-01-01"
      : period === "7d"
        ? addDays(today, -6)
        : period === "30d"
          ? addDays(today, -29)
          : period === "90d"
            ? addDays(today, -89)
            : month.start;
  const end = period === "month" ? month.end : today;
  const dueEnd = period === "all" ? "9999-12-31" : end;
  return { dueEnd, end, start };
}

export function expiryLabel(date: string, today = isoToday()) {
  if (date < today) return { label: "Vencido", tone: "danger" as const };
  if (date === today) return { label: "Vence hoje", tone: "danger" as const };
  if (date <= addDays(today, 7)) return { label: "Vence em até 7 dias", tone: "warning" as const };
  if (date <= addDays(today, 30))
    return { label: "Vence em até 30 dias", tone: "attention" as const };
  return { label: "Em dia", tone: "ok" as const };
}
