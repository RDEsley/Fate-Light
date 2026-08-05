import type { Metadata } from "next";

import { AccountShell } from "@/app/_components/account-shell";
import { ClientCombobox } from "@/components/ui/form-controls";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatDateTimePtBr } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Histórico" };

const entityOptions = [
  ["all", "Tudo"],
  ["client", "Clientes"],
  ["client_service", "Serviços aplicados"],
  ["charge", "Cobranças"],
  ["expense", "Despesas"],
  ["domain", "Domínios"],
] as const;

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
  searchParams: Promise<{ clientId?: string; q?: string; type?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const entityType = entityOptions.some(([value]) => value === parameters.type)
    ? parameters.type!
    : "all";
  let eventsRequest = context.supabase
    .from("activity_events")
    .select("id, client_id, entity_type, action, summary, occurred_at, clients(name)")
    .eq("workspace_id", context.workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(150);
  if (query) eventsRequest = eventsRequest.ilike("summary", `%${query}%`);
  if (entityType !== "all") eventsRequest = eventsRequest.eq("entity_type", entityType);
  if (parameters.clientId) eventsRequest = eventsRequest.eq("client_id", parameters.clientId);

  const [{ data: events, error }, { data: clients }] = await Promise.all([
    eventsRequest,
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
  ]);

  return (
    <AccountShell
      description="Acompanhe decisões, pagamentos e mudanças sem perder o contexto de cada cliente."
      title="Histórico"
    >
      <form className="panel-card history-filters mb-5" method="get">
        <label className="relative text-sm font-semibold">
          <span className="field__label">Buscar no histórico</span>
          <span className="relative block">
            <Icon
              className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              name="search"
            />
            <input
              className="w-full pl-9"
              defaultValue={query}
              maxLength={80}
              name="q"
              placeholder="Pagamento, serviço, domínio..."
              type="search"
            />
          </span>
        </label>
        <label className="text-sm font-semibold">
          Tipo de atividade
          <select defaultValue={entityType} name="type">
            {entityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ClientCombobox
          clients={(clients ?? []).map((client) => ({
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
        <button className="primary-action self-end" type="submit">
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
                  {event.clients?.name ? (
                    <p className="text-muted mt-2 text-sm">Cliente: {event.clients.name}</p>
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
          <p className="text-muted mt-1 text-sm">Ajuste os filtros ou comece a operar o sistema.</p>
        </section>
      )}
    </AccountShell>
  );
}
