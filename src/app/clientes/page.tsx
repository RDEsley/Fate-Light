import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { Icon } from "@/components/ui/icon";
import { clientListHref, parseClientQuery } from "@/features/clients/query";
import { readClientLinks } from "@/features/clients/schemas";
import { clientStatusInfo } from "@/features/clients/status";
import { formatCurrency } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { restoreClient } from "./actions";
import { ClientStatusMessage } from "./status-message";

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
  searchParams: Promise<{ page?: string; q?: string; state?: string; status?: string }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const parameters = await searchParams;
  const query = parseClientQuery(parameters);
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const firstRow = (query.page - 1) * pageSize;
  const showingArchived = query.state === "archived";
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
  if (query.q) request = request.ilike("name", `%${query.q}%`);
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
          <input
            className="min-h-11 w-full rounded-xl pr-4 pl-9"
            defaultValue={query.q}
            maxLength={80}
            name="q"
            placeholder="Buscar cliente..."
            type="search"
          />
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 font-black"
          type="submit"
        >
          Filtrar
        </button>
        <div className="client-filter-pills sm:col-span-2">
          {stateFilters.map(([value, label]) => (
            <Link
              aria-current={query.state === value ? "page" : undefined}
              href={
                value === "all"
                  ? ((query.q
                      ? `/clientes?q=${encodeURIComponent(query.q)}`
                      : "/clientes") as never)
                  : ((query.q
                      ? `/clientes?q=${encodeURIComponent(query.q)}&state=${value}`
                      : `/clientes?state=${value}`) as never)
              }
              key={value}
            >
              {label}
            </Link>
          ))}
        </div>
      </form>
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
            const status = clientStatusInfo(client.commercial_status ?? "inactive");
            const activeServices = client.active_services ?? 0;
            const overdueCharges = client.overdue_charges ?? 0;
            const expiringDomains = client.expiring_domains ?? 0;
            const earned = Number(client.lifetime_revenue ?? 0);
            const firstStart = client.first_service_start;
            return (
              <article
                className="cartoon-card client-summary-card flex min-h-52 flex-col p-4 sm:p-5"
                key={clientId}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-brand-soft text-brand-strong border-brand/20 grid size-11 place-items-center rounded-2xl border font-black">
                    {clientName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={status.className}>
                    <Icon className="size-3.5" name={status.icon} />
                    {status.label}
                  </span>
                </div>
                <Link
                  className="hover:text-brand-strong mt-4 text-lg font-black tracking-[-0.02em]"
                  href={`/clientes/${clientId}`}
                >
                  {clientName}
                </Link>
                {client.trade_name ? (
                  <p className="text-muted mt-1 text-sm">{client.trade_name}</p>
                ) : null}
                <div className="client-card-signals" aria-label="Resumo operacional">
                  <span title={`${activeServices} serviço(s) ativo(s)`}>
                    <Icon name="briefcase" /> {activeServices}
                  </span>
                  {overdueCharges ? (
                    <span
                      className="is-critical"
                      title={`${overdueCharges} cobrança(s) vencida(s)`}
                    >
                      <Icon name="alert" /> {overdueCharges}
                    </span>
                  ) : null}
                  {expiringDomains ? (
                    <span
                      className="is-warning"
                      title={`${expiringDomains} domínio(s) vencendo em até 30 dias`}
                    >
                      <Icon name="globe" /> {expiringDomains}
                    </span>
                  ) : null}
                  {firstStart ? (
                    <span title="Tempo desde o primeiro serviço">
                      <Icon name="history" /> {activeTimeLabel(firstStart)}
                    </span>
                  ) : null}
                  {earned > 0 ? (
                    <span className="is-positive" title="Total já recebido deste cliente">
                      <Icon name="wallet" /> {formatCurrency(earned)}
                    </span>
                  ) : null}
                </div>
                {client.email ||
                client.phone ||
                client.website ||
                client.notes ||
                readClientLinks(client.links).length ? (
                  <div className="client-card-contact">
                    {client.email ? (
                      <a href={`mailto:${client.email}`} title={client.email}>
                        <Icon className="size-3.5" name="bell" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    ) : null}
                    {client.phone ? (
                      <a href={`tel:${client.phone.replace(/[^+\d]/g, "")}`}>
                        <Icon className="size-3.5" name="user" />
                        <span className="truncate">{client.phone}</span>
                      </a>
                    ) : null}
                    {client.website ? (
                      <a
                        href={`https://${client.website}`}
                        rel="noreferrer noopener"
                        target="_blank"
                        title={client.website}
                      >
                        <Icon className="size-3.5" name="link" />
                        <span className="truncate">{client.website}</span>
                      </a>
                    ) : null}
                    {readClientLinks(client.links).map((link) => (
                      <a
                        href={`https://${link.url}`}
                        key={link.url}
                        rel="noreferrer noopener"
                        target="_blank"
                        title={link.url}
                      >
                        <Icon className="size-3.5" name="link" />
                        <span className="truncate">{link.label}</span>
                      </a>
                    ))}
                    {client.notes ? (
                      <Link
                        className="client-card-contact__note"
                        href={`/clientes/${clientId}#observacoes`}
                      >
                        <Icon className="size-3.5" name="info" />
                        <span className="truncate">Tem observações</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                <div className="border-line mt-auto flex items-center justify-between gap-3 border-t pt-4">
                  <Link
                    className="text-brand-strong text-sm font-black"
                    href={`/clientes/${clientId}`}
                  >
                    Abrir cliente →
                  </Link>
                  {showingArchived ? (
                    <form action={restoreClient}>
                      <input name="clientId" type="hidden" value={clientId} />
                      <button
                        className="text-muted hover:text-foreground text-xs font-bold"
                        type="submit"
                      >
                        Desarquivar
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
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
