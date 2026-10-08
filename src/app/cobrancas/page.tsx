import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { Icon } from "@/components/ui/icon";
import { RecordGroup, RecordList } from "@/components/ui/record-row";
import { SearchClearField } from "@/components/ui/search-clear-field";
import { newestResolvedFirst } from "@/features/charges/resolution-order";
import { isoDateInTimeZone } from "@/features/mvp/format";
import {
  appendIdInFilter,
  escapeIlikePattern,
  textSearchOrFilter,
} from "@/features/search/list-query";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { ChargeRow, chargeListColumns, chargeListLabels } from "./charge-row";
import { FocusCharge } from "./focus-charge";

export const metadata: Metadata = { title: "Cobranças" };

const stateFilters = [
  ["all", "Todas"],
  ["pending", "Pendentes"],
  ["paid", "Pagas"],
  ["cancelled", "Canceladas"],
] as const;
const pageSize = 50;

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    entity?: string;
    focus?: string;
    page?: string;
    q?: string;
    state?: string;
    status?: string;
  }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const clientFilter = z.string().uuid().safeParse(parameters.clientId);
  const filteredClientId = clientFilter.success ? clientFilter.data : null;
  const entityFilter = z.string().uuid().safeParse(parameters.entity);
  const filteredEntityId = entityFilter.success ? entityFilter.data : null;
  const state = ["pending", "paid", "cancelled"].includes(parameters.state ?? "")
    ? parameters.state!
    : "all";
  const page = Math.max(1, Number.parseInt(parameters.page ?? "1", 10) || 1);
  const firstRow = (page - 1) * pageSize;
  const chargeColumns =
    "id, client_id, client_entity_id, description, due_date, company_revenue, media_budget, additional_fee, additional_fee_is_revenue, gross_total, status, paid_at, cancelled_at, payment_method, delay_reason, delay_reason_code, delay_recorded_at, cancel_reason, cancel_reason_code, clients(name), client_entities(display_name), fiscal_documents(id, created_at, mime_type, size_bytes)";

  const relatedSearch =
    query.length === 0
      ? { clientIds: [] as string[], entityIds: [] as string[] }
      : await Promise.all([
          context.supabase
            .from("clients")
            .select("id")
            .eq("workspace_id", context.workspaceId)
            .or(textSearchOrFilter(["name", "trade_name"], query)),
          context.supabase
            .from("client_entities")
            .select("id")
            .eq("workspace_id", context.workspaceId)
            .ilike("display_name", `%${escapeIlikePattern(query)}%`),
        ]).then(([clients, entities]) => ({
          clientIds: (clients.data ?? []).map((row) => row.id),
          entityIds: (entities.data ?? []).map((row) => row.id),
        }));

  // Em "Todos", duas consultas de propósito: pendentes sobem ordenadas pelo vencimento
  // mais próximo, resolvidas descem ordenadas pela mais recente. Um único `order` não
  // expressa isso, e ordenar só no cliente deixaria o corte de 100 registros descartar
  // pendências antigas. `status` ausente significa "tudo que não está pendente"; quando
  // ele vem, o recorte vai no banco — filtrar em memória depois do `limit` fazia "Pagas"
  // mostrar só o que sobrasse das 100 resolvidas mais recentes, que podiam ser todas
  // canceladas.
  const buildRequest = (status: "cancelled" | "paid" | "pending", paginated = false) => {
    let request = context.supabase
      .from("charges")
      .select(chargeColumns, { count: "exact" })
      .eq("workspace_id", context.workspaceId)
      .eq("status", status)
      .order(status === "pending" ? "due_date" : status === "paid" ? "paid_at" : "cancelled_at", {
        ascending: status === "pending",
        nullsFirst: false,
      });
    if (filteredClientId) request = request.eq("client_id", filteredClientId);
    if (filteredEntityId) request = request.eq("client_entity_id", filteredEntityId);
    request = paginated
      ? request.range(firstRow, firstRow + pageSize - 1)
      : request.limit(status === "pending" ? 200 : 100);
    if (query) {
      const parts = textSearchOrFilter(
        ["description", "payment_method", "notes", "delay_reason", "cancel_reason"],
        query,
      ).split(",");
      appendIdInFilter(parts, "client_id", relatedSearch.clientIds);
      appendIdInFilter(parts, "client_entity_id", relatedSearch.entityIds);
      request = request.or(parts.join(","));
    }
    return request;
  };

  const chargesRequest =
    state === "all"
      ? Promise.all([
          buildRequest("pending"),
          buildRequest("paid"),
          buildRequest("cancelled"),
        ]).then(([open, paid, cancelled]) => ({
          data: [
            ...(open.data ?? []),
            ...newestResolvedFirst([...(paid.data ?? []), ...(cancelled.data ?? [])]).slice(0, 100),
          ],
          count: (open.count ?? 0) + (paid.count ?? 0) + (cancelled.count ?? 0),
          error: open.error ?? paid.error ?? cancelled.error,
          hidden: {
            cancelled: Math.max(0, (cancelled.count ?? 0) - 100),
            paid: Math.max(0, (paid.count ?? 0) - 100),
            pending: Math.max(0, (open.count ?? 0) - 200),
          },
        }))
      : buildRequest(state as "cancelled" | "paid" | "pending", true).then((result) => ({
          ...result,
          hidden: null,
        }));

  const { data: charges, error, count, hidden } = await chargesRequest;
  const today = isoDateInTimeZone(context.workspaceTimezone);
  const totalPages = state === "all" ? 1 : Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const chargeHref = (targetPage: number, targetState = state) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (targetState !== "all") next.set("state", targetState);
    if (filteredClientId) next.set("clientId", filteredClientId);
    if (filteredEntityId) next.set("entity", filteredEntityId);
    if (targetPage > 1) next.set("page", String(targetPage));
    const suffix = next.toString();
    return `/cobrancas${suffix ? `?${suffix}` : ""}` as never;
  };

  return (
    <AccountShell
      description="Acompanhe cobranças pendentes e resolvidas. Para criar uma nova, abra a ficha do cliente."
      title="Cobranças"
    >
      <MvpStatusMessage status={parameters.status} />
      <FocusCharge chargeId={parameters.focus} />

      <form className="panel-card mb-4 grid gap-3 p-3! sm:grid-cols-[1fr_auto]" method="get">
        <label className="relative">
          <span className="sr-only">Buscar cobranças</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <SearchClearField
            aria-label="Buscar cobranças"
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            placeholder="Descrição, cliente, empresa, pagamento..."
          />
        </label>
        {filteredClientId ? <input name="clientId" type="hidden" value={filteredClientId} /> : null}
        {filteredEntityId ? <input name="entity" type="hidden" value={filteredEntityId} /> : null}
        {state !== "all" ? <input name="state" type="hidden" value={state} /> : null}
        <button className="button button--primary" type="submit">
          Filtrar
        </button>
        <nav aria-label="Filtrar por situação" className="client-filter-pills sm:col-span-2">
          {stateFilters.map(([value, label]) => (
            <Link
              aria-current={state === value ? "page" : undefined}
              href={chargeHref(1, value)}
              key={value}
            >
              {label}
            </Link>
          ))}
        </nav>
      </form>

      {filteredClientId ? (
        <aside className="helper-note mb-4" role="status">
          <Icon className="size-4" name="info" />
          <span>
            Mostrando cobranças deste cliente
            {filteredEntityId ? " e desta empresa/marca" : ""}.{" "}
            <Link href="/cobrancas">Ver todas</Link> ·{" "}
            {filteredEntityId ? (
              <>
                <Link href={`/cobrancas?clientId=${filteredClientId}`}>Ver o cliente inteiro</Link>{" "}
                ·{" "}
              </>
            ) : null}
            <Link href={`/clientes/${filteredClientId}?action=new-charge#cobranca-avulsa`}>
              Nova cobrança avulsa na ficha
            </Link>
          </span>
        </aside>
      ) : null}

      {state === "all" && hidden && (hidden.pending || hidden.paid || hidden.cancelled) ? (
        <aside className="helper-note mb-4" role="status">
          <Icon className="size-4" name="info" />
          <span>
            Esta visão resume as 200 pendentes mais próximas e as 100 resolvidas mais recentes. Para
            navegar por todo o histórico, use os filtros de{" "}
            <Link href="/cobrancas?state=pending">pendentes</Link>,{" "}
            <Link href="/cobrancas?state=paid">pagas</Link> ou{" "}
            <Link href="/cobrancas?state=cancelled">canceladas</Link>.
          </span>
        </aside>
      ) : null}

      {error ? (
        <p className="panel-card" role="alert">
          Não foi possível carregar as cobranças.
        </p>
      ) : charges?.length ? (
        <RecordList columns={chargeListColumns} head={chargeListLabels}>
          {charges.map((charge, index) => {
            // A primeira cobrança já resolvida marca a fronteira entre "a fazer" e
            // "feito" — é o que mostra para onde a cobrança recém-paga foi.
            const startsResolved =
              charge.status !== "pending" && charges[index - 1]?.status === "pending";
            return (
              <Fragment key={charge.id}>
                {startsResolved ? (
                  <RecordGroup>
                    <Icon className="size-4" name="check" /> Resolvidas
                  </RecordGroup>
                ) : null}
                <ChargeRow
                  charge={{
                    additionalFee: charge.additional_fee,
                    additionalFeeIsRevenue: charge.additional_fee_is_revenue,
                    cancelReason: charge.cancel_reason,
                    cancelReasonCode: charge.cancel_reason_code,
                    clientId: charge.client_id,
                    clientName: charge.clients?.name,
                    companyRevenue: charge.company_revenue,
                    delayReason: charge.delay_reason,
                    description: charge.description,
                    documents: (charge.fiscal_documents ?? []).map((document) => ({
                      createdAt: document.created_at,
                      id: document.id,
                      mimeType: document.mime_type,
                      sizeBytes: document.size_bytes,
                    })),
                    dueDate: charge.due_date,
                    entityName: charge.client_entities?.display_name,
                    grossTotal: charge.gross_total,
                    id: charge.id,
                    mediaBudget: charge.media_budget,
                    paidAt: charge.paid_at,
                    paymentMethod: charge.payment_method,
                    status: charge.status,
                  }}
                  // O alerta leva até a cobrança: ela já chega aberta, com os detalhes à vista.
                  defaultOpen={parameters.focus === charge.id}
                  returnTo="/cobrancas"
                  today={today}
                />
              </Fragment>
            );
          })}
        </RecordList>
      ) : (
        <section className="empty-state">
          <span className="empty-state__icon">
            <Icon name="receipt" />
          </span>
          <strong>Nenhuma cobrança por aqui</strong>
          <p>
            {query || state !== "all"
              ? "Nenhuma cobrança corresponde ao filtro atual."
              : "Aplique um serviço na ficha de um cliente ou crie uma cobrança avulsa por lá."}
          </p>
        </section>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Paginação de cobranças"
          className="mt-6 flex items-center justify-between gap-3 text-sm"
        >
          {page > 1 ? <Link href={chargeHref(page - 1)}>Anterior</Link> : <span />}
          <span>
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>
          {page < totalPages ? <Link href={chargeHref(page + 1)}>Próxima</Link> : <span />}
        </nav>
      ) : null}
    </AccountShell>
  );
}
