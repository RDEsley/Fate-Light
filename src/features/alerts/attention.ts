import "server-only";

import type { Route } from "next";
import { cache } from "react";

import { alertHorizon } from "@/features/alerts/offsets";
import { addDays, formatDatePtBr, isoDateInTimeZone } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export type AttentionItem = {
  /** Data do vencimento em ISO. Quem agrupa por prazo lê daqui, nunca do texto de `meta`. */
  date: string;
  href: Route;
  id: string;
  meta: string;
  severity: "danger" | "warning";
  source: "adjustment" | "charge" | "domain" | "expense" | "manual";
  title: string;
};

function dueLabel(date: string, today: string) {
  if (date < today) return "vencido";
  if (date === today) return "vence hoje";
  return `vence em ${formatDatePtBr(date)}`;
}

/**
 * `cache` porque o AppShell monta o sino em toda página e a central de alertas pede a
 * mesma lista de novo: sem isso a tela de alertas fazia dez consultas para mostrar uma.
 * A chave é o workspace — o contexto em si já vem memoizado por requisição.
 */
export const getAttentionItems = cache(async function getAttentionItems(
  context: Awaited<ReturnType<typeof requireWorkspaceContext>>,
) {
  const today = isoDateInTimeZone(context.workspaceTimezone);
  // A antecedência configurada em Configurações da empresa passa a valer de verdade;
  // antes a consulta usava 7 e 30 dias fixos e a preferência do usuário não fazia nada.
  const { data: settings } = await context.supabase
    .from("workspace_settings")
    .select("default_alert_offsets")
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();
  const horizon = alertHorizon(settings?.default_alert_offsets);
  const limit = addDays(today, horizon);

  const [
    { count: chargeCount, data: charges },
    { count: expenseCount, data: expenses },
    { count: domainCount, data: domains },
    { count: adjustmentCount, data: adjustments },
    { count: manualCount, data: manualAlerts },
  ] = await Promise.all([
    context.supabase
      .from("charges")
      .select("id, description, due_date, clients(name)", { count: "exact" })
      .eq("workspace_id", context.workspaceId)
      .eq("status", "pending")
      .lte("due_date", limit)
      .order("due_date")
      .limit(50),
    context.supabase
      .from("expenses")
      .select("id, description, due_date", { count: "exact" })
      .eq("workspace_id", context.workspaceId)
      .eq("status", "pending")
      .lte("due_date", limit)
      .order("due_date")
      .limit(50),
    context.supabase
      .from("domains")
      .select("id, domain, expires_on, clients(name)", { count: "exact" })
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .lte("expires_on", limit)
      .order("expires_on")
      .limit(50),
    context.supabase
      // Serviço pausado não entra no radar: foi o usuário que pediu a pausa.
      .from("client_services")
      .select("id, client_id, name, next_adjustment_date, clients(name)", { count: "exact" })
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .not("next_adjustment_date", "is", null)
      .lte("next_adjustment_date", limit)
      .order("next_adjustment_date")
      .limit(50),
    context.supabase
      .from("manual_alerts")
      .select("id, title, notes, due_on, severity", { count: "exact" })
      .eq("workspace_id", context.workspaceId)
      .eq("state", "open")
      .order("due_on")
      .limit(50),
  ]);

  const items: AttentionItem[] = [
    ...(manualAlerts ?? []).map((alert) => ({
      date: alert.due_on,
      href: `/alertas#manual-${alert.id}` as Route,
      id: `manual-${alert.id}`,
      meta: `${alert.notes ? `${alert.notes} · ` : ""}${formatDatePtBr(alert.due_on)}`,
      severity: alert.severity as "danger" | "warning",
      source: "manual" as const,
      title: alert.title,
    })),
    // O alerta funciona como guia: leva direto à cobrança citada, não à lista genérica.
    ...(charges ?? []).map((charge) => ({
      date: charge.due_date,
      href: `/cobrancas?focus=${charge.id}` as Route,
      id: `charge-${charge.id}`,
      meta: `${charge.clients?.name ?? "Cliente"} · ${formatDatePtBr(charge.due_date)}`,
      severity: charge.due_date <= today ? ("danger" as const) : ("warning" as const),
      source: "charge" as const,
      title:
        charge.due_date < today
          ? `Cobrança vencida: ${charge.description}`
          : charge.due_date === today
            ? `Cobrança vence hoje: ${charge.description}`
            : `Cobrança próxima: ${charge.description}`,
    })),
    ...(expenses ?? []).map((expense) => ({
      date: expense.due_date,
      href: `/despesas?focus=${expense.id}` as Route,
      id: `expense-${expense.id}`,
      meta: `Vencimento ${formatDatePtBr(expense.due_date)}`,
      severity: expense.due_date <= today ? ("danger" as const) : ("warning" as const),
      source: "expense" as const,
      title:
        expense.due_date < today
          ? `Despesa vencida: ${expense.description}`
          : expense.due_date === today
            ? `Despesa vence hoje: ${expense.description}`
            : `Despesa próxima: ${expense.description}`,
    })),
    ...(domains ?? []).map((domain) => ({
      date: domain.expires_on,
      href: `/dominios?focus=${domain.id}` as Route,
      id: `domain-${domain.id}`,
      meta: `${domain.clients?.name ?? "Cliente"} · ${formatDatePtBr(domain.expires_on)}`,
      severity: domain.expires_on <= today ? ("danger" as const) : ("warning" as const),
      source: "domain" as const,
      title:
        domain.expires_on < today
          ? `Domínio expirado: ${domain.domain}`
          : domain.expires_on === today
            ? `Domínio expira hoje: ${domain.domain}`
            : `Domínio ${dueLabel(domain.expires_on, today)}: ${domain.domain}`,
    })),
    ...(adjustments ?? []).map((service) => ({
      date: service.next_adjustment_date!,
      href: `/clientes/${service.client_id}` as Route,
      id: `adjustment-${service.id}`,
      meta: `${service.clients?.name ?? "Cliente"} · ${formatDatePtBr(service.next_adjustment_date)}`,
      severity: service.next_adjustment_date! < today ? ("danger" as const) : ("warning" as const),
      source: "adjustment" as const,
      title:
        service.next_adjustment_date! < today
          ? `Reajuste pendente: ${service.name}`
          : `Revisar reajuste: ${service.name}`,
    })),
  ];

  items.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "danger" ? -1 : 1;
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return left.title.localeCompare(right.title, "pt-BR");
  });
  return {
    items,
    total:
      (chargeCount ?? 0) +
      (expenseCount ?? 0) +
      (domainCount ?? 0) +
      (adjustmentCount ?? 0) +
      (manualCount ?? 0),
  };
});
