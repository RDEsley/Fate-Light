import "server-only";

import type { Route } from "next";

import { addDays, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export type AttentionItem = {
  href: Route;
  id: string;
  meta: string;
  severity: "danger" | "warning";
  title: string;
};

export async function getAttentionItems(
  context: Awaited<ReturnType<typeof requireWorkspaceContext>>,
) {
  const today = isoToday();
  const nextWeek = addDays(today, 7);
  const nextMonth = addDays(today, 30);
  const [{ data: charges }, { data: expenses }, { data: domains }, { data: adjustments }] =
    await Promise.all([
      context.supabase
        .from("charges")
        .select("id, description, due_date, clients(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "pending")
        .lte("due_date", nextWeek)
        .order("due_date")
        .limit(20),
      context.supabase
        .from("expenses")
        .select("id, description, due_date")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "pending")
        .lte("due_date", nextWeek)
        .order("due_date")
        .limit(20),
      context.supabase
        .from("domains")
        .select("id, domain, expires_on, clients(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "active")
        .lte("expires_on", nextMonth)
        .order("expires_on")
        .limit(20),
      context.supabase
        .from("client_services")
        .select("id, client_id, name, next_adjustment_date, clients(name)")
        .eq("workspace_id", context.workspaceId)
        .eq("status", "active")
        .not("next_adjustment_date", "is", null)
        .lte("next_adjustment_date", nextMonth)
        .order("next_adjustment_date")
        .limit(20),
    ]);

  const items: AttentionItem[] = [
    ...(charges ?? []).map((charge) => ({
      href: "/cobrancas" as const,
      id: `charge-${charge.id}`,
      meta: `${charge.clients?.name ?? "Cliente"} · ${formatDatePtBr(charge.due_date)}`,
      severity: charge.due_date < today ? ("danger" as const) : ("warning" as const),
      title:
        charge.due_date < today
          ? `Cobrança vencida: ${charge.description}`
          : `Cobrança próxima: ${charge.description}`,
    })),
    ...(expenses ?? []).map((expense) => ({
      href: "/despesas" as const,
      id: `expense-${expense.id}`,
      meta: `Vencimento ${formatDatePtBr(expense.due_date)}`,
      severity: expense.due_date < today ? ("danger" as const) : ("warning" as const),
      title:
        expense.due_date < today
          ? `Despesa vencida: ${expense.description}`
          : `Despesa próxima: ${expense.description}`,
    })),
    ...(domains ?? []).map((domain) => ({
      href: "/dominios" as const,
      id: `domain-${domain.id}`,
      meta: `${domain.clients?.name ?? "Cliente"} · ${formatDatePtBr(domain.expires_on)}`,
      severity: domain.expires_on < today ? ("danger" as const) : ("warning" as const),
      title:
        domain.expires_on < today
          ? `Domínio expirado: ${domain.domain}`
          : `Domínio perto de expirar: ${domain.domain}`,
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
}
