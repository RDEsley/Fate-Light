import "server-only";

import type { Route } from "next";
import { cache } from "react";

import { alertHorizon } from "@/features/alerts/offsets";
import { addDays, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export type AttentionItem = {
  href: Route;
  id: string;
  meta: string;
  severity: "danger" | "warning";
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
  const today = isoToday();
  // A antecedência configurada em Configurações da empresa passa a valer de verdade;
  // antes a consulta usava 7 e 30 dias fixos e a preferência do usuário não fazia nada.
  const { data: settings } = await context.supabase
    .from("workspace_settings")
    .select("default_alert_offsets")
    .eq("workspace_id", context.workspaceId)
    .maybeSingle();
  const horizon = alertHorizon(settings?.default_alert_offsets);
  const limit = addDays(today, horizon);

  const [{ data: charges }, { data: expenses }, { data: domains }, { data: adjustments }] =
    await Promise.all([
      context.supabase
        .from("charges")
        .select("id, description, due_date, clients(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "pending")
        .lte("due_date", limit)
        .order("due_date")
        .limit(20),
      context.supabase
        .from("expenses")
        .select("id, description, due_date")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "pending")
        .lte("due_date", limit)
        .order("due_date")
        .limit(20),
      context.supabase
        .from("domains")
        .select("id, domain, expires_on, clients(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "active")
        .lte("expires_on", limit)
        .order("expires_on")
        .limit(20),
      context.supabase
        // Serviço pausado não entra no radar: foi o usuário que pediu a pausa.
        .from("client_services")
        .select("id, client_id, name, next_adjustment_date, clients(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "active")
        .not("next_adjustment_date", "is", null)
        .lte("next_adjustment_date", limit)
        .order("next_adjustment_date")
        .limit(20),
    ]);

  const items: AttentionItem[] = [
    // O alerta funciona como guia: leva direto à cobrança citada, não à lista genérica.
    ...(charges ?? []).map((charge) => ({
      href: `/cobrancas?focus=${charge.id}` as Route,
      id: `charge-${charge.id}`,
      meta: `${charge.clients?.name ?? "Cliente"} · ${formatDatePtBr(charge.due_date)}`,
      severity: charge.due_date <= today ? ("danger" as const) : ("warning" as const),
      title:
        charge.due_date < today
          ? `Cobrança vencida: ${charge.description}`
          : charge.due_date === today
            ? `Cobrança vence hoje: ${charge.description}`
            : `Cobrança próxima: ${charge.description}`,
    })),
    ...(expenses ?? []).map((expense) => ({
      href: `/despesas?focus=${expense.id}` as Route,
      id: `expense-${expense.id}`,
      meta: `Vencimento ${formatDatePtBr(expense.due_date)}`,
      severity: expense.due_date <= today ? ("danger" as const) : ("warning" as const),
      title:
        expense.due_date < today
          ? `Despesa vencida: ${expense.description}`
          : expense.due_date === today
            ? `Despesa vence hoje: ${expense.description}`
            : `Despesa próxima: ${expense.description}`,
    })),
    ...(domains ?? []).map((domain) => ({
      href: `/dominios?focus=${domain.id}` as Route,
      id: `domain-${domain.id}`,
      meta: `${domain.clients?.name ?? "Cliente"} · ${formatDatePtBr(domain.expires_on)}`,
      severity: domain.expires_on <= today ? ("danger" as const) : ("warning" as const),
      title:
        domain.expires_on < today
          ? `Domínio expirado: ${domain.domain}`
          : domain.expires_on === today
            ? `Domínio expira hoje: ${domain.domain}`
            : `Domínio ${dueLabel(domain.expires_on, today)}: ${domain.domain}`,
    })),
    ...(adjustments ?? []).map((service) => ({
      href: `/clientes/${service.client_id}` as Route,
      id: `adjustment-${service.id}`,
      meta: `${service.clients?.name ?? "Cliente"} · ${formatDatePtBr(service.next_adjustment_date)}`,
      severity: service.next_adjustment_date! < today ? ("danger" as const) : ("warning" as const),
      title:
        service.next_adjustment_date! < today
          ? `Reajuste pendente: ${service.name}`
          : `Revisar reajuste: ${service.name}`,
    })),
  ];

  return items.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "danger" ? -1 : 1;
    return left.meta.localeCompare(right.meta, "pt-BR");
  });
});
