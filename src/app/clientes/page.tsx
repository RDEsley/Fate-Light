import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { Icon } from "@/components/ui/icon";
import { SearchClearField } from "@/components/ui/search-clear-field";
import { clientListHref, parseClientQuery } from "@/features/clients/query";
import { textSearchOrFilter } from "@/features/search/list-query";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { ClientStatusMessage } from "./status-message";
import { ClientSummaryCard } from "./client-summary-card";

export const metadata: Metadata = { title: "Clientes" };
const pageSize = 20;

const stateFilters = [
  ["all", "Todos"],
  ["active", "Ativos"],
  ["budget", "Orçamento"],
  ["pending", "Pendentes"],
  ["inactive", "Inativos"],
  ["blacklist", "Lista negra"],
  ["archived", "Arquivados"],
] as const;

type ClientsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    state?: string;
    status?: string;
    view?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const parameters = await searchParams;
  const query = parseClientQuery(parameters);
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const firstRow = (query.page - 1) * pageSize;
  const showingArchived = query.state === "archived";
  // Uma consulta só para as empresas/marcas ativas do workspace: ela serve tanto ao
  // recorte `view=entities` quanto à contagem exibida em cada card, sem N+1.
  const { data: entityRows } = await supabase
    .from("client_entities")
    .select("client_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .is("archived_at", null)
    .limit(2000);
  const entityCounts = new Map<string, number>();
  for (const row of entityRows ?? []) {
    entityCounts.set(row.client_id, (entityCounts.get(row.client_id) ?? 0) + 1);
  }
  const showingEntities = query.view === "entities";
  // A ordenação combina situação e dinheiro: ativos primeiro, e dentro de cada situação
  // quem mais rendeu na frente, com o cliente mais antigo desempatando. Ordenar e paginar
  // sobre a view garante que isso valha para a lista inteira, não só para a página aberta.
  let request = supabase
    .from("client_directory")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("status_rank")
    .order("lifetime_revenue", { ascending: false })
    .order("first_service_start", { nullsFirst: false })
    .order("name")
    .range(firstRow, firstRow + pageSize - 1);
  request = showingArchived
    ? request.not("archived_at", "is", null)
    : request.is("archived_at", null);
  if (query.state !== "all" && !showingArchived) {
    request = request.eq("commercial_status", query.state);
  }
  if (query.q) {
    request = request.or(textSearchOrFilter(["name", "trade_name", "email", "phone", "notes"], query.q));
  }
  if (showingEntities) request = request.in("id", [...entityCounts.keys()]);
  const { data: clients, error, count } = await request;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AccountShell
      description="Encontre, cadastre e mantenha os clientes usados na operação diária."
      title="Clientes"
    >
      <ClientStatusMessage status={parameters.status} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted flex items-center gap-2 text-sm">
          <span className="bg-brand-soft text-brand-strong grid size-8 place-items-center rounded-lg">
            <Icon className="size-4" name="users" />
          </span>
          <strong className="text-foreground">{total}</strong>{" "}
          {total === 1 ? "cliente" : "clientes"}
        </p>
        <Link
          className="bg-brand text-brand-contrast border-brand-strong flex min-h-11 items-center gap-2 rounded-xl border-2 px-5 py-2.5 font-black shadow-[2px_2px_0_rgba(37,50,58,.14)]"
          href="/clientes/novo"
        >
          <Icon className="size-4" name="plus" /> Novo cliente
        </Link>
      </div>
      <form className="panel-card mb-5 grid gap-3 p-3! sm:grid-cols-[1fr_auto]" method="get">
        <label className="relative text-sm font-semibold">
          <span className="sr-only">Buscar por nome</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <SearchClearField
            aria-label="Buscar cliente"
            className="min-h-11 w-full rounded-xl pr-4 pl-9"
            defaultValue={query.q}
            placeholder="Nome, empresa, e-mail, telefone..."
          />
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 font-black"
          type="submit"
        >
          Filtrar
        </button>
        {showingEntities ? <input name="view" type="hidden" value="entities" /> : null}
        <div className="client-filter-pills sm:col-span-2">
          {stateFilters.map(([value, label]) => (
            <Link
              aria-current={query.state === value ? "page" : undefined}
              href={filterHref(query.q, value, query.view)}
              key={value}
            >
              {label}
            </Link>
          ))}
          <Link
            aria-current={showingEntities ? "page" : undefined}
            href={filterHref(query.q, query.state, showingEntities ? "all" : "entities")}
          >
            Com empresas/marcas
          </Link>
        </div>
      </form>
      {showingEntities ? (
        <aside className="helper-note mb-4" role="status">
          <Icon className="size-4" name="building" />
          <span>
            Mostrando apenas clientes que já têm empresa ou marca cadastrada.{" "}
            <Link href={filterHref(query.q, query.state, "all")}>Ver todos os clientes</Link>
          </span>
        </aside>
      ) : null}
      {error ? (
        <p className="border-line bg-surface rounded-2xl border p-6" role="alert">
          Não foi possível carregar os clientes.
        </p>
      ) : clients?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => {
            // Toda coluna de view chega anulável para o gerador de tipos; na prática
            // id e nome vêm de colunas NOT NULL da tabela base.
            const clientId = client.id ?? "";
            const clientName = client.name ?? "";
            const firstStart = client.first_service_start;
            return (
              <ClientSummaryCard
                activeServices={client.active_services ?? 0}
                clientId={clientId}
                earned={Number(client.lifetime_revenue ?? 0)}
                email={client.email}
                entityCount={entityCounts.get(clientId) ?? 0}
                expiringDomains={client.expiring_domains ?? 0}
                firstStart={firstStart}
                key={clientId}
                links={client.links}
                name={clientName}
                notes={client.notes}
                overdueCharges={client.overdue_charges ?? 0}
                phone={client.phone}
                showingArchived={showingArchived}
                status={client.commercial_status ?? "inactive"}
                tenureLabel={firstStart ? activeTimeLabel(firstStart) : null}
                tradeName={client.trade_name}
                website={client.website}
              />
            );
          })}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhum cliente encontrado</h2>
          <p className="text-muted mt-2">
            {showingArchived
              ? "Nenhum cliente arquivado por aqui."
              : "Ajuste a busca ou crie o primeiro cliente."}
          </p>
        </section>
      )}
      {totalPages > 1 ? (
        <nav aria-label="Paginação de clientes" className="mt-6 flex justify-between">
          {query.page > 1 ? (
            <Link href={clientListHref(query, query.page - 1)}>Anterior</Link>
          ) : (
            <span />
          )}
          <span>
            Página {Math.min(query.page, totalPages)} de {totalPages}
          </span>
          {query.page < totalPages ? (
            <Link href={clientListHref(query, query.page + 1)}>Próxima</Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </AccountShell>
  );
}

/** Monta o link de um filtro preservando busca, situação e o recorte de empresas/marcas. */
function filterHref(search: string, state: string, view: string) {
  const parameters = new URLSearchParams();
  if (search) parameters.set("q", search);
  if (state !== "all") parameters.set("state", state);
  if (view !== "all") parameters.set("view", view);
  const suffix = parameters.toString();
  return (suffix ? `/clientes?${suffix}` : "/clientes") as Route;
}

function activeTimeLabel(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const months = Math.max(
    0,
    (new Date().getFullYear() - start.getFullYear()) * 12 +
      new Date().getMonth() -
      start.getMonth(),
  );
  if (months < 1) return "< 1 mês";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}
