import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { clientListHref, parseClientQuery } from "@/features/clients/query";

import { archiveClient, restoreClient } from "./actions";
import { ClientStatusMessage } from "./status-message";

export const metadata: Metadata = { title: "Clientes" };

const pageSize = 20;
const commercialStatusLabels: Record<string, string> = {
  active: "Ativo",
  archived: "Arquivado",
  inactive: "Inativo",
  lead: "Lead",
  paused: "Pausado",
};

type ClientsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    view?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const parameters = await searchParams;
  const query = parseClientQuery(parameters);
  const { fullName, supabase, theme, workspaceId } = await requireWorkspaceContext();
  const firstRow = (query.page - 1) * pageSize;

  let clientsQuery = supabase
    .from("clients")
    .select("id, name, trade_name, commercial_status, responsible_name, tags, archived_at", {
      count: "exact",
    })
    .eq("workspace_id", workspaceId)
    .order("name")
    .range(firstRow, firstRow + pageSize - 1);

  clientsQuery =
    query.view === "archived"
      ? clientsQuery.not("archived_at", "is", null)
      : clientsQuery.is("archived_at", null);
  if (query.status !== "all" && query.view === "active") {
    clientsQuery = clientsQuery.eq("commercial_status", query.status);
  }
  if (query.q) clientsQuery = clientsQuery.ilike("name", `%${query.q}%`);

  const { data: clients, error, count } = await clientsQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AccountShell
      description="Cadastros comerciais isolados pelo workspace. Situação financeira permanece derivada, sem saldo armazenado no cliente."
      fullName={fullName}
      theme={theme}
      title="Clientes"
    >
      <ClientStatusMessage status={parameters.status} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          {total} {total === 1 ? "cliente encontrado" : "clientes encontrados"}
        </p>
        <Link
          className="bg-brand text-brand-contrast hover:bg-brand-strong rounded-xl px-5 py-3 font-semibold"
          href="/clientes/novo"
        >
          Novo cliente
        </Link>
      </div>

      <form
        className="border-line bg-surface mb-6 grid gap-4 rounded-2xl border p-5 sm:grid-cols-[1fr_auto_auto_auto]"
        method="get"
      >
        <label className="text-sm font-semibold">
          Buscar por nome
          <input
            className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
            defaultValue={query.q}
            maxLength={80}
            name="q"
            type="search"
          />
        </label>
        <label className="text-sm font-semibold">
          Status comercial
          <select
            className="border-line bg-canvas mt-2 min-h-11 rounded-xl border px-4 py-3"
            defaultValue={query.status}
            name="status"
          >
            <option value="all">Todos</option>
            <option value="lead">Lead</option>
            <option value="active">Ativo</option>
            <option value="paused">Pausado</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Exibição
          <select
            className="border-line bg-canvas mt-2 min-h-11 rounded-xl border px-4 py-3"
            defaultValue={query.view}
            name="view"
          >
            <option value="active">Atuais</option>
            <option value="archived">Arquivados</option>
          </select>
        </label>
        <button
          className="bg-brand text-brand-contrast hover:bg-brand-strong min-h-11 self-end rounded-xl px-5 py-3 font-semibold"
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
        <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-brand-soft text-brand-strong">
              <tr>
                <th className="px-5 py-4 font-semibold">Cliente</th>
                <th className="px-5 py-4 font-semibold">Status comercial</th>
                <th className="px-5 py-4 font-semibold">Situação financeira</th>
                <th className="px-5 py-4 font-semibold">Responsável</th>
                <th className="px-5 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-5 py-4">
                    <Link className="font-semibold hover:underline" href={`/clientes/${client.id}`}>
                      {client.name}
                    </Link>
                    {client.trade_name ? (
                      <span className="text-muted mt-1 block">{client.trade_name}</span>
                    ) : null}
                    {client.tags.length ? (
                      <span className="text-muted mt-2 block text-xs">
                        {client.tags.join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    {commercialStatusLabels[client.commercial_status] ?? "Em análise"}
                  </td>
                  <td className="px-5 py-4">Sem cobrança aberta</td>
                  <td className="px-5 py-4">{client.responsible_name ?? "Não informado"}</td>
                  <td className="px-5 py-4">
                    {client.archived_at ? (
                      <form action={restoreClient}>
                        <input name="clientId" type="hidden" value={client.id} />
                        <button className="font-semibold hover:underline" type="submit">
                          Restaurar
                        </button>
                      </form>
                    ) : (
                      <form action={archiveClient}>
                        <input name="clientId" type="hidden" value={client.id} />
                        <button className="font-semibold hover:underline" type="submit">
                          Arquivar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhum cliente nesta visão</h2>
          <p className="text-muted mt-2">Ajuste os filtros ou crie o primeiro cadastro.</p>
        </section>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Paginação de clientes" className="mt-6 flex items-center justify-between">
          {query.page > 1 ? (
            <Link
              className="font-semibold hover:underline"
              href={clientListHref(query, query.page - 1)}
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted text-sm">
            Página {Math.min(query.page, totalPages)} de {totalPages}
          </span>
          {query.page < totalPages ? (
            <Link
              className="font-semibold hover:underline"
              href={clientListHref(query, query.page + 1)}
            >
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </AccountShell>
  );
}
