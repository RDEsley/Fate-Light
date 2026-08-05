import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { Icon } from "@/components/ui/icon";
import { clientListHref, parseClientQuery } from "@/features/clients/query";
import { addDays, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { setClientStatus } from "./actions";
import { ClientStatusMessage } from "./status-message";

export const metadata: Metadata = { title: "Clientes" };
const pageSize = 20;

type ClientsPageProps = {
  searchParams: Promise<{ page?: string; q?: string; state?: string; status?: string }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const parameters = await searchParams;
  const query = parseClientQuery(parameters);
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const firstRow = (query.page - 1) * pageSize;
  let request = supabase
    .from("clients")
    .select(
      "id, name, trade_name, email, phone, commercial_status, client_services(status, start_date, ended_at), charges(status, due_date), domains(status, expires_on)",
      { count: "exact" },
    )
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name")
    .range(firstRow, firstRow + pageSize - 1);
  if (query.state !== "all") request = request.eq("commercial_status", query.state);
  if (query.q) request = request.ilike("name", `%${query.q}%`);
  const { data: clients, error, count } = await request;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const today = isoToday();
  const nextMonth = addDays(today, 30);

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
      <form className="panel-card mb-5 grid gap-3 p-3! sm:grid-cols-[1fr_auto_auto]" method="get">
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
        <label className="text-sm font-semibold">
          <span className="sr-only">Status</span>
          <select
            className="min-h-11 w-full rounded-xl px-4 sm:w-36"
            defaultValue={query.state}
            name="state"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 self-end rounded-xl border-2 px-5 font-black"
          type="submit"
        >
          Filtrar
        </button>
      </form>
      {error ? (
        <p className="border-line bg-surface rounded-2xl border p-6" role="alert">
          Não foi possível carregar os clientes.
        </p>
      ) : clients?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => {
            const activeServices = client.client_services.filter(
              (service) => service.status === "active",
            );
            const overdueCharges = client.charges.filter(
              (charge) => charge.status === "pending" && charge.due_date < today,
            ).length;
            const expiringDomains = client.domains.filter(
              (domain) => domain.status === "active" && domain.expires_on <= nextMonth,
            ).length;
            const firstStart = client.client_services
              .map((service) => service.start_date)
              .sort()[0];
            return (
              <article
                className="cartoon-card client-summary-card flex min-h-52 flex-col p-4 sm:p-5"
                key={client.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-brand-soft text-brand-strong border-brand/20 grid size-11 place-items-center rounded-2xl border font-black">
                    {client.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className={`${client.commercial_status === "active" ? "bg-positive-soft text-positive" : "bg-slate-100 text-slate-600"} rounded-full px-3 py-1 text-xs font-black`}
                  >
                    {client.commercial_status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <Link
                  className="hover:text-brand-strong mt-4 text-lg font-black tracking-[-0.02em]"
                  href={`/clientes/${client.id}`}
                >
                  {client.name}
                </Link>
                <p className="text-muted mt-1 text-sm">
                  {client.trade_name ?? "Sem nome fantasia"}
                </p>
                <div className="client-card-signals" aria-label="Resumo operacional">
                  <span title={`${activeServices.length} serviço(s) ativo(s)`}>
                    <Icon name="briefcase" /> {activeServices.length}
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
                </div>
                <div className="text-muted mt-4 space-y-1 text-sm">
                  <p className="truncate">{client.email ?? "E-mail não informado"}</p>
                  <p>{client.phone ?? "Telefone não informado"}</p>
                </div>
                <div className="border-line mt-auto flex items-center justify-between border-t pt-4">
                  <Link
                    className="text-brand-strong text-sm font-black"
                    href={`/clientes/${client.id}`}
                  >
                    Abrir cliente →
                  </Link>
                  <form action={setClientStatus}>
                    <input name="clientId" type="hidden" value={client.id} />
                    <input
                      name="clientStatus"
                      type="hidden"
                      value={client.commercial_status === "active" ? "inactive" : "active"}
                    />
                    <button
                      className="text-muted hover:text-foreground text-xs font-bold"
                      type="submit"
                    >
                      {client.commercial_status === "active" ? "Inativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhum cliente encontrado</h2>
          <p className="text-muted mt-2">Ajuste a busca ou crie o primeiro cliente.</p>
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
