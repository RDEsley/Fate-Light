import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { clientListHref, parseClientQuery } from "@/features/clients/query";
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
  const { fullName, supabase, theme, workspaceId } = await requireWorkspaceContext();
  const firstRow = (query.page - 1) * pageSize;
  let request = supabase
    .from("clients")
    .select("id, name, trade_name, email, phone, commercial_status", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("name")
    .range(firstRow, firstRow + pageSize - 1);
  if (query.state !== "all") request = request.eq("commercial_status", query.state);
  if (query.q) request = request.ilike("name", `%${query.q}%`);
  const { data: clients, error, count } = await request;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AccountShell
      description="Encontre, cadastre e mantenha os clientes usados na operação diária."
      fullName={fullName}
      theme={theme}
      title="Clientes"
    >
      <ClientStatusMessage status={parameters.status} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          {total} {total === 1 ? "cliente" : "clientes"}
        </p>
        <Link
          className="bg-brand text-brand-contrast rounded-xl px-5 py-3 font-semibold"
          href="/clientes/novo"
        >
          Novo cliente
        </Link>
      </div>
      <form
        className="border-line bg-surface mb-6 grid gap-4 rounded-2xl border p-5 sm:grid-cols-[1fr_auto_auto]"
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
          Status
          <select
            className="border-line bg-canvas mt-2 min-h-11 rounded-xl border px-4 py-3"
            defaultValue={query.state}
            name="state"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </label>
        <button
          className="bg-brand text-brand-contrast min-h-11 self-end rounded-xl px-5 py-3 font-semibold"
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
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-brand-soft text-brand-strong">
              <tr>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Contato</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Ações</th>
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
                  </td>
                  <td className="px-5 py-4">
                    <span className="block">{client.email ?? "Sem e-mail"}</span>
                    <span className="text-muted block">{client.phone ?? "Sem telefone"}</span>
                  </td>
                  <td className="px-5 py-4">
                    {client.commercial_status === "active" ? "Ativo" : "Inativo"}
                  </td>
                  <td className="px-5 py-4">
                    <form action={setClientStatus}>
                      <input name="clientId" type="hidden" value={client.id} />
                      <input
                        name="clientStatus"
                        type="hidden"
                        value={client.commercial_status === "active" ? "inactive" : "active"}
                      />
                      <button className="font-semibold hover:underline" type="submit">
                        {client.commercial_status === "active" ? "Inativar" : "Ativar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
