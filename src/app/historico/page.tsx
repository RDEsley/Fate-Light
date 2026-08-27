import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { SettingsTabs } from "@/app/_components/settings-tabs";
import { ClientCombobox } from "@/components/ui/form-controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { formatDateTimePtBr } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Histórico" };
const pageSize = 50;

const entityOptions = [
  ["all", "Tudo"],
  ["client", "Clientes"],
  ["client_service", "Serviços aplicados"],
  ["charge", "Cobranças"],
  ["expense", "Despesas"],
  ["domain", "Domínios"],
] as const;

const entityDescriptions: Record<string, string> = {
  all: "Todos os registros do workspace",
  charge: "Emissão, pagamento e cancelamento",
  client: "Cadastro e situação comercial",
  client_service: "Aplicação, pausa e encerramento",
  domain: "Acompanhamento e expiração",
  expense: "Lançamento e quitação",
};

const entityMeta: Record<string, { icon: IconName; label: string }> = {
  charge: { icon: "receipt", label: "Cobrança" },
  client: { icon: "user", label: "Cliente" },
  client_service: { icon: "briefcase", label: "Serviço" },
  domain: { icon: "globe", label: "Domínio" },
  expense: { icon: "wallet", label: "Despesa" },
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; page?: string; q?: string; type?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const entityType = entityOptions.some(([value]) => value === parameters.type)
    ? parameters.type!
    : "all";
  const page = Math.max(1, Number.parseInt(parameters.page ?? "1", 10) || 1);
  const firstRow = (page - 1) * pageSize;
  let eventsRequest = context.supabase
    .from("activity_events")
    .select("id, client_id, entity_type, action, summary, occurred_at, clients(name)", {
      count: "exact",
    })
    .eq("workspace_id", context.workspaceId)
    .order("occurred_at", { ascending: false })
    .range(firstRow, firstRow + pageSize - 1);
  if (query) eventsRequest = eventsRequest.ilike("summary", `%${query}%`);
  if (entityType !== "all") eventsRequest = eventsRequest.eq("entity_type", entityType);
  if (parameters.clientId) eventsRequest = eventsRequest.eq("client_id", parameters.clientId);

  const [{ data: events, error, count }, { data: clients }] = await Promise.all([
    eventsRequest,
    context.supabase
      .from("clients")
      .select("id, name, trade_name, email, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
  ]);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const historyHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (entityType !== "all") next.set("type", entityType);
    if (parameters.clientId) next.set("clientId", parameters.clientId);
    if (targetPage > 1) next.set("page", String(targetPage));
    const suffix = next.toString();
    return `/historico${suffix ? `?${suffix}` : ""}` as never;
  };

  return (
    <AccountShell
      description="Acompanhe decisões, pagamentos e mudanças sem perder o contexto de cada cliente."
      title="Histórico"
    >
      <div className="settings-layout">
        <aside className="settings-layout__nav">
          <SettingsTabs />
        </aside>
        <div className="settings-layout__content">
          <form className="panel-card history-filters mb-5" method="get">
            <label className="field">
              <span className="field__label">Buscar no histórico</span>
              <span className="relative block">
                <Icon
                  className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  name="search"
                />
                <input
                  className="w-full pl-9!"
                  defaultValue={query}
                  maxLength={80}
                  name="q"
                  placeholder="Pagamento, serviço, domínio..."
                  type="search"
                />
              </span>
            </label>
            <SelectField
              defaultValue={entityType}
              label="Tipo de atividade"
              name="type"
              options={entityOptions.map(([value, label]) => ({
                description: entityDescriptions[value],
                label,
                value,
              }))}
            />
            <ClientCombobox
              clients={(clients ?? []).map((client) => ({
                email: client.email,
                id: client.id,
                name: client.name,
                status: client.commercial_status,
                tradeName: client.trade_name,
              }))}
              defaultFilter="all"
              defaultValue={parameters.clientId}
              label="Cliente"
              optional
            />
            <button className="primary-action history-filters__submit" type="submit">
              Filtrar
            </button>
          </form>

          {error ? (
            <p className="panel-card" role="alert">
              Não foi possível carregar o histórico.
            </p>
          ) : events?.length ? (
            <ol className="activity-timeline">
              {events.map((event) => {
                const meta = entityMeta[event.entity_type] ?? {
                  icon: "history" as const,
                  label: "Atividade",
                };
                return (
                  <li key={event.id}>
                    <span className="activity-timeline__icon">
                      <Icon className="size-4" name={meta.icon} />
                    </span>
                    <article className="cartoon-card">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="activity-timeline__type">{meta.label}</span>
                          <h2>{event.summary}</h2>
                        </div>
                        <time dateTime={event.occurred_at}>
                          {formatDateTimePtBr(event.occurred_at)}
                        </time>
                      </div>
                      {event.clients?.name && event.client_id ? (
                        <Link
                          className="text-brand-strong mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                          href={`/clientes/${event.client_id}`}
                        >
                          <Icon className="size-3.5" name="user" /> {event.clients.name}
                        </Link>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <section className="panel-card py-10 text-center">
              <Icon className="text-brand mx-auto size-7" name="history" />
              <h2 className="mt-3 text-lg font-black">Nenhuma atividade encontrada</h2>
              <p className="text-muted mt-1 text-sm">
                Ajuste os filtros ou comece a operar o sistema.
              </p>
            </section>
          )}
          {totalPages > 1 ? (
            <nav
              aria-label="Paginação do histórico"
              className="mt-6 flex items-center justify-between gap-3 text-sm"
            >
              {page > 1 ? <Link href={historyHref(page - 1)}>Anterior</Link> : <span />}
              <span>
                Página {Math.min(page, totalPages)} de {totalPages}
              </span>
              {page < totalPages ? <Link href={historyHref(page + 1)}>Próxima</Link> : <span />}
            </nav>
          ) : null}
        </div>
      </div>
    </AccountShell>
  );
}
