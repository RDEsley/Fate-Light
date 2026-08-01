import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { addDays, formatCurrency, isoToday, monthBounds } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Dashboard" };

function sum<T>(items: T[], value: (item: T) => number | string) {
  return items.reduce((total, item) => total + Number(value(item)), 0);
}

export default async function DashboardPage() {
  const context = await requireWorkspaceContext();
  const today = isoToday();
  const nextWeek = addDays(today, 7);
  const nextMonth = addDays(today, 30);
  const month = monthBounds();
  const [
    { data: charges, error: chargesError },
    { data: expenses, error: expensesError },
    { data: domains, error: domainsError },
    { count: activeClients, error: clientsError },
  ] = await Promise.all([
    context.supabase
      .from("charges")
      .select(
        "id, description, due_date, company_revenue, media_budget, additional_fee, status, paid_at, clients(name)",
      )
      .eq("workspace_id", context.workspaceId)
      .neq("status", "cancelled"),
    context.supabase
      .from("expenses")
      .select("amount, status, paid_at")
      .eq("workspace_id", context.workspaceId),
    context.supabase
      .from("domains")
      .select("id, domain, expires_on, clients(name)")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .lte("expires_on", nextMonth)
      .order("expires_on"),
    context.supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", context.workspaceId)
      .eq("commercial_status", "active")
      .is("archived_at", null),
  ]);
  const allCharges = charges ?? [];
  const paidThisMonth = allCharges.filter(
    (charge) =>
      charge.status === "paid" &&
      charge.paid_at &&
      charge.paid_at.slice(0, 10) >= month.start &&
      charge.paid_at.slice(0, 10) <= month.end,
  );
  const chargesThisMonth = allCharges.filter(
    (charge) => charge.due_date >= month.start && charge.due_date <= month.end,
  );
  const pending = allCharges.filter((charge) => charge.status === "pending");
  const paidExpenses = (expenses ?? []).filter(
    (expense) =>
      expense.status === "paid" &&
      expense.paid_at &&
      expense.paid_at.slice(0, 10) >= month.start &&
      expense.paid_at.slice(0, 10) <= month.end,
  );
  const ownReceived = sum(
    paidThisMonth,
    (charge) => Number(charge.company_revenue) + Number(charge.additional_fee),
  );
  const ownPending = sum(
    pending,
    (charge) => Number(charge.company_revenue) + Number(charge.additional_fee),
  );
  const mediaMonth = sum(chargesThisMonth, (charge) => charge.media_budget);
  const expensesPaid = sum(paidExpenses, (expense) => expense.amount);
  const overdue = pending.filter((charge) => charge.due_date < today);
  const dueSoon = pending.filter(
    (charge) => charge.due_date >= today && charge.due_date <= nextWeek,
  );
  const expiredDomains = (domains ?? []).filter((domain) => domain.expires_on < today);

  const cards = [
    ["Receita própria recebida", formatCurrency(ownReceived)],
    ["Receita própria pendente", formatCurrency(ownPending)],
    ["Verba de mídia do mês", formatCurrency(mediaMonth)],
    ["Despesas pagas no mês", formatCurrency(expensesPaid)],
    ["Resultado do mês", formatCurrency(ownReceived - expensesPaid)],
    ["Clientes ativos", String(activeClients ?? 0)],
  ];
  const hasError = Boolean(chargesError || expensesError || domainsError || clientsError);

  return (
    <AccountShell
      description="Visão objetiva do caixa operacional e dos próximos vencimentos."
      fullName={context.fullName}
      theme={context.theme}
      title="Dashboard"
    >
      {hasError ? (
        <p className="border-line bg-surface mb-6 rounded-2xl border p-5" role="alert">
          Alguns indicadores não puderam ser carregados. Atualize a página para tentar novamente.
        </p>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          className="bg-brand text-brand-contrast rounded-xl px-4 py-3 font-semibold"
          href="/clientes/novo"
        >
          Novo cliente
        </Link>
        <Link className="border-line rounded-xl border px-4 py-3 font-semibold" href="/cobrancas">
          Nova cobrança
        </Link>
        <Link className="border-line rounded-xl border px-4 py-3 font-semibold" href="/despesas">
          Nova despesa
        </Link>
      </div>
      <section aria-label="Resumo do mês" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <article className="border-line bg-surface rounded-2xl border p-5" key={label}>
            <p className="text-muted text-sm">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AlertList
          empty="Nenhuma cobrança vencida."
          items={overdue.map(
            (charge) =>
              `${charge.clients?.name ?? "Cliente"} — ${charge.description} (${charge.due_date})`,
          )}
          title={`Cobranças vencidas (${overdue.length})`}
        />
        <AlertList
          empty="Nenhuma cobrança nos próximos 7 dias."
          items={dueSoon.map(
            (charge) =>
              `${charge.clients?.name ?? "Cliente"} — ${charge.description} (${charge.due_date})`,
          )}
          title={`Próximos 7 dias (${dueSoon.length})`}
        />
        <AlertList
          empty="Nenhum domínio vencido."
          items={expiredDomains.map(
            (domain) => `${domain.domain} — ${domain.clients?.name ?? "Cliente"}`,
          )}
          title={`Domínios vencidos (${expiredDomains.length})`}
        />
        <AlertList
          empty="Nenhum domínio expira nos próximos 30 dias."
          items={(domains ?? [])
            .filter((domain) => domain.expires_on >= today)
            .map((domain) => `${domain.domain} — ${domain.expires_on}`)}
          title={`Domínios nos próximos 30 dias (${(domains ?? []).filter((domain) => domain.expires_on >= today).length})`}
        />
      </div>
    </AccountShell>
  );
}

function AlertList({ empty, items, title }: { empty: string; items: string[]; title: string }) {
  return (
    <section className="border-line bg-surface rounded-2xl border p-5">
      <h2 className="font-semibold">{title}</h2>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li className="border-line border-t pt-2 first:border-0 first:pt-0" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted mt-3 text-sm">{empty}</p>
      )}
    </section>
  );
}
