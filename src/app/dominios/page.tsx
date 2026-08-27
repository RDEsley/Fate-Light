import type { Metadata } from "next";
import Link from "next/link";

import { createDomain } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { Icon } from "@/components/ui/icon";
import { addDays, formatCurrency, isoDateInTimeZone } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { DomainCard } from "./domain-card";
import { DomainForm } from "./domain-form";

export const metadata: Metadata = { title: "Domínios" };
const pageSize = 40;

const stateFilters = [
  ["all", "Todos"],
  ["expiring", "Vencendo"],
  ["active", "Ativos"],
  ["cancelled", "Cancelados"],
] as const;

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; state?: string; status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const state = stateFilters.some(([value]) => value === parameters.state)
    ? parameters.state!
    : "all";
  const today = isoDateInTimeZone(context.workspaceTimezone);
  const nextMonth = addDays(today, 30);
  const page = Math.max(1, Number.parseInt(parameters.page ?? "1", 10) || 1);
  const firstRow = (page - 1) * pageSize;

  let domainsRequest = context.supabase
    .from("domains")
    .select(
      "id, client_id, domain, registrar, expires_on, auto_renew, cost, payment_responsibility, status, notes, clients(name)",
      { count: "exact" },
    )
    .eq("workspace_id", context.workspaceId)
    .order("expires_on")
    .range(firstRow, firstRow + pageSize - 1);
  if (query) domainsRequest = domainsRequest.ilike("domain", `%${query}%`);
  if (state === "active" || state === "cancelled") {
    domainsRequest = domainsRequest.eq("status", state);
  }
  if (state === "expiring") {
    domainsRequest = domainsRequest.eq("status", "active").lte("expires_on", nextMonth);
  }

  const [
    { data: clients },
    { data: domains, error, count },
    { data: summary, error: summaryError },
  ] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, email, website, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    domainsRequest,
    context.supabase
      .rpc("domain_operational_summary", {
        p_next_week: addDays(today, 7),
        p_today: today,
        p_workspace_id: context.workspaceId,
      })
      .maybeSingle(),
  ]);

  const clientOptions = (clients ?? []).map((client) => ({
    email: client.email,
    id: client.id,
    name: client.name,
    status: client.commercial_status,
    tradeName: client.trade_name,
    website: client.website,
  }));

  const rows = domains ?? [];
  const overdue = Number(summary?.overdue ?? 0);
  const dueToday = Number(summary?.due_today ?? 0);
  const dueThisWeek = Number(summary?.due_this_week ?? 0);
  const totalCost = Number(summary?.active_cost ?? 0);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const domainHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (state !== "all") next.set("state", state);
    if (targetPage > 1) next.set("page", String(targetPage));
    const suffix = next.toString();
    return ("/dominios" + (suffix ? "?" + suffix : "")) as never;
  };

  return (
    <AccountShell
      description="Acompanhe expirações e responsáveis antes que um domínio fique indisponível."
      title="Domínios"
    >
      <MvpStatusMessage status={parameters.status} />

      {summaryError ? (
        <p className="panel-card mb-4" role="alert">
          Não foi possível calcular o resumo completo dos domínios.
        </p>
      ) : null}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Vencidos" tone="negative" value={String(overdue)} />
        <SummaryCard label="Vencem hoje" tone="warning" value={String(dueToday)} />
        <SummaryCard label="Nesta semana" tone="warning" value={String(dueThisWeek)} />
        <SummaryCard label="Custo anual" tone="brand" value={formatCurrency(totalCost)} />
      </div>

      <form className="panel-card mb-4 grid gap-3 p-3! sm:grid-cols-[1fr_auto]" method="get">
        <label className="relative text-sm font-semibold">
          <span className="sr-only">Buscar domínios</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <input
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Buscar domínio..."
            type="search"
          />
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 text-sm font-black"
          type="submit"
        >
          Filtrar
        </button>
        <div className="client-filter-pills sm:col-span-2">
          {stateFilters.map(([value, label]) => (
            <a
              aria-current={state === value ? "page" : undefined}
              href={
                query
                  ? `/dominios?q=${encodeURIComponent(query)}&state=${value}`
                  : `/dominios?state=${value}`
              }
              key={value}
            >
              {label}
            </a>
          ))}
        </div>
      </form>

      <details className="panel-card form-disclosure mb-5">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-violet-soft text-violet grid size-9 place-items-center rounded-xl">
              <Icon className="size-4" name="plus" />
            </span>
            Novo domínio
          </span>
          <span className="text-muted flex items-center gap-1 text-xs">
            <span className="form-disclosure__closed-label">Abrir formulário</span>
            <span className="form-disclosure__open-label">Fechar formulário</span>
            <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
          </span>
        </summary>
        <DomainForm action={createDomain} clients={clientOptions} />
      </details>

      {error ? (
        <p className="panel-card" role="alert">
          Não foi possível carregar os domínios.
        </p>
      ) : rows.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((domain) => (
            <DomainCard
              cancelled={domain.status === "cancelled"}
              clientName={domain.clients?.name ?? "Cliente"}
              clients={clientOptions}
              key={domain.id}
              today={today}
              domain={{
                autoRenew: domain.auto_renew,
                clientId: domain.client_id,
                cost: domain.cost === null ? null : Number(domain.cost),
                domain: domain.domain,
                expiresOn: domain.expires_on,
                id: domain.id,
                notes: domain.notes,
                paymentResponsibility: domain.payment_responsibility,
                registrar: domain.registrar,
              }}
            />
          ))}
        </div>
      ) : (
        <section className="panel-card py-10 text-center">
          <Icon className="text-brand mx-auto size-7" name="globe" />
          <h2 className="mt-3 text-lg font-black">Nenhum domínio por aqui</h2>
          <p className="text-muted mt-1 text-sm">
            {query || state !== "all"
              ? "Nenhum domínio corresponde ao filtro atual."
              : "Cadastre o primeiro domínio para ser avisado antes de qualquer expiração."}
          </p>
        </section>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Paginação de domínios"
          className="mt-6 flex items-center justify-between gap-3 text-sm"
        >
          {page > 1 ? <Link href={domainHref(page - 1)}>Anterior</Link> : <span />}
          <span>
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>
          {page < totalPages ? <Link href={domainHref(page + 1)}>Próxima</Link> : <span />}
        </nav>
      ) : null}
    </AccountShell>
  );
}

function SummaryCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "brand" | "negative" | "warning";
  value: string;
}) {
  const tones = {
    brand: "bg-brand-soft text-brand-strong border-brand/25",
    negative: "bg-negative-soft text-negative border-negative/25",
    warning: "bg-warning-soft text-warning border-warning/25",
  };
  return (
    <article className={`cartoon-card flex items-center justify-between p-4 ${tones[tone]}`}>
      <span className="text-sm font-bold">{label}</span>
      <strong className="text-xl font-black tabular-nums">{value}</strong>
    </article>
  );
}
