import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";

import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { FocusRecord } from "@/components/ui/focus-record";
import { FormPanel } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { RecordGroup, RecordList } from "@/components/ui/record-row";
import { SearchClearField } from "@/components/ui/search-clear-field";
import { clientEntityTypeLabel } from "@/features/clients/entity-schemas";
import { addDays, formatDatePtBr, isoDateInTimeZone } from "@/features/mvp/format";
import {
  appendIdInFilter,
  idsMatchingText,
  textSearchOrFilter,
} from "@/features/search/list-query";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { ExpenseForm } from "./expense-form";
import { ExpenseRow, expenseColumnLabels, expenseColumns } from "./expense-row";

export const metadata: Metadata = { title: "Despesas" };
const pageSize = 40;
const pendingLimit = 200;
const paidLimit = 100;

const categories = [
  ["tools", "Ferramentas"],
  ["artificial_intelligence", "Inteligência artificial"],
  ["agents", "Agentes"],
  ["staff_contractors", "Funcionários ou prestadores"],
  ["domains", "Domínios"],
  ["hosting", "Hospedagem"],
  ["software", "Software"],
  ["marketing", "Marketing"],
  ["other", "Outros"],
] as const;

const categoryOptions = categories.map(([value, label]) => ({ label, value }));
const categoryLabels = new Map<string, string>(categories);

const stateFilters = [
  ["all", "Todas"],
  ["pending", "Pendentes"],
  ["paid", "Pagas"],
] as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    due?: string;
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
  const state = ["pending", "paid"].includes(parameters.state ?? "") ? parameters.state! : "all";
  // `due=next7` é o destino do card "Despesas nos próximos 7 dias" do dashboard: mesmo
  // recorte que a RPC do painel conta, para o número e a lista nunca se contradizerem.
  const dueWindow = parameters.due === "next7" ? "next7" : "all";
  const today = isoDateInTimeZone(context.workspaceTimezone);
  const nextWeek = addDays(today, 7);
  const page = Math.max(1, Number.parseInt(parameters.page ?? "1", 10) || 1);
  const firstRow = (page - 1) * pageSize;

  const [{ data: clients }, { data: entityRows }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("client_entities")
      .select("id, client_id, display_name, entity_type")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .is("archived_at", null)
      .order("display_name")
      .limit(2000),
  ]);

  const searchParts = query
    ? textSearchOrFilter(["description", "category", "notes"], query).split(",")
    : [];
  if (query) {
    appendIdInFilter(
      searchParts,
      "client_id",
      idsMatchingText(clients, query, ["name", "trade_name"]),
    );
    appendIdInFilter(
      searchParts,
      "client_entity_id",
      idsMatchingText(entityRows, query, ["display_name"]),
    );
  }

  // Em "Todas", duas consultas de propósito: o que falta pagar sobe pelo vencimento mais
  // próximo (as vencidas ficam no topo) e o que já foi pago desce pelo pagamento mais
  // recente. Uma ordenação só deixava a despesa vencida perdida no meio das pagas.
  const buildRequest = (status: "paid" | "pending" | null, paginated: boolean) => {
    let request = context.supabase
      .from("expenses")
      .select(
        "id, description, category, amount, due_date, status, paid_at, expense_type, recurrence_active, recurrence_frequency, recurrence_group_id, clients(name), client_entities(display_name), fiscal_documents(id, created_at, mime_type, size_bytes)",
        { count: "exact" },
      )
      .eq("workspace_id", context.workspaceId)
      .order(status === "paid" ? "paid_at" : "due_date", {
        ascending: status !== "paid",
        nullsFirst: false,
      });
    if (status) request = request.eq("status", status);
    if (parameters.clientId) request = request.eq("client_id", parameters.clientId);
    if (parameters.entity) request = request.eq("client_entity_id", parameters.entity);
    if (searchParts.length) request = request.or(searchParts.join(","));
    if (dueWindow === "next7") {
      request = request.gte("due_date", today).lte("due_date", nextWeek);
    }
    return paginated
      ? request.range(firstRow, firstRow + pageSize - 1)
      : request.limit(status === "pending" ? pendingLimit : paidLimit);
  };

  const grouped = state === "all" && dueWindow === "all";
  const {
    data: expenses,
    error,
    count,
    hidden,
  } = await (grouped
    ? Promise.all([buildRequest("pending", false), buildRequest("paid", false)]).then(
        ([open, paid]) => ({
          count: (open.count ?? 0) + (paid.count ?? 0),
          data: [...(open.data ?? []), ...(paid.data ?? [])],
          error: open.error ?? paid.error,
          hidden:
            Math.max(0, (open.count ?? 0) - pendingLimit) +
            Math.max(0, (paid.count ?? 0) - paidLimit),
        }),
      )
    : buildRequest(state === "all" ? null : (state as "paid" | "pending"), true).then((result) => ({
        ...result,
        hidden: 0,
      })));
  const totalPages = grouped ? 1 : Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const expenseHref = (targetPage: number, targetState = state, targetDue = dueWindow) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (targetState !== "all") next.set("state", targetState);
    if (targetDue !== "all") next.set("due", targetDue);
    if (parameters.clientId) next.set("clientId", parameters.clientId);
    if (parameters.entity) next.set("entity", parameters.entity);
    if (targetPage > 1) next.set("page", String(targetPage));
    const suffix = next.toString();
    return `/despesas${suffix ? `?${suffix}` : ""}` as never;
  };
  return (
    <AccountShell
      description="Registre custos pagos ou pendentes. Despesas fixas podem repetir todo mês ao serem quitadas."
      title="Despesas"
    >
      <MvpStatusMessage status={parameters.status} />
      <FocusRecord targetId={parameters.focus ? `expense-${parameters.focus}` : undefined} />
      <form className="panel-card mb-4 grid gap-3 p-3! sm:grid-cols-[1fr_auto]" method="get">
        <label className="relative">
          <span className="sr-only">Buscar despesas</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <SearchClearField
            aria-label="Buscar despesas"
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            placeholder="Descrição, cliente, empresa, categoria..."
          />
        </label>
        {state !== "all" ? <input name="state" type="hidden" value={state} /> : null}
        {dueWindow !== "all" ? <input name="due" type="hidden" value={dueWindow} /> : null}
        {parameters.clientId ? (
          <input name="clientId" type="hidden" value={parameters.clientId} />
        ) : null}
        {parameters.entity ? <input name="entity" type="hidden" value={parameters.entity} /> : null}
        <button className="button button--primary" type="submit">
          Filtrar
        </button>
        <nav aria-label="Filtrar despesas" className="client-filter-pills sm:col-span-2">
          {stateFilters.map(([value, label]) => (
            <Link
              aria-current={state === value ? "page" : undefined}
              href={expenseHref(1, value)}
              key={value}
            >
              {label}
            </Link>
          ))}
          <Link
            aria-current={dueWindow === "next7" ? "page" : undefined}
            href={expenseHref(1, state, dueWindow === "next7" ? "all" : "next7")}
          >
            Próximos 7 dias
          </Link>
        </nav>
      </form>
      {dueWindow === "next7" ? (
        <aside className="helper-note mb-4" role="status">
          <Icon className="size-4" name="calendar" />
          <span>
            Mostrando despesas que vencem entre {formatDatePtBr(today)} e {formatDatePtBr(nextWeek)}
            . <Link href="/despesas">Ver todas</Link>
          </span>
        </aside>
      ) : null}
      <FormPanel
        className="mb-5"
        description="Custo fixo ou avulso, pago ou a pagar"
        title="Nova despesa"
        tone="danger"
      >
        <ExpenseForm
          categoryOptions={categoryOptions}
          clients={(clients ?? []).map((client) => ({
            id: client.id,
            name: client.name,
            status: client.commercial_status,
            tradeName: client.trade_name,
          }))}
          entities={(entityRows ?? []).map((entity) => ({
            clientId: entity.client_id,
            id: entity.id,
            name: entity.display_name,
            typeLabel: clientEntityTypeLabel(entity.entity_type),
          }))}
        />
      </FormPanel>
      {hidden ? (
        <aside className="helper-note mb-4" role="status">
          <Icon className="size-4" name="info" />
          <span>
            Esta visão resume as {pendingLimit} pendentes mais próximas e as {paidLimit} pagas mais
            recentes. Para navegar por tudo, use os filtros de{" "}
            <Link href="/despesas?state=pending">pendentes</Link> ou{" "}
            <Link href="/despesas?state=paid">pagas</Link>.
          </span>
        </aside>
      ) : null}
      {error ? (
        <p className="panel-card" role="alert">
          Não foi possível carregar as despesas.
        </p>
      ) : expenses?.length ? (
        <RecordList columns={expenseColumns} head={expenseColumnLabels}>
          {expenses.map((expense, index) => (
            <Fragment key={expense.id}>
              {/* A primeira paga depois das pendentes marca a fronteira entre "a pagar" e "feito". */}
              {expense.status === "paid" && expenses[index - 1]?.status === "pending" ? (
                <RecordGroup>
                  <Icon className="size-4" name="check" /> Pagas
                </RecordGroup>
              ) : null}
              <ExpenseRow
                // O alerta leva até a despesa: ela já chega aberta, com os detalhes à vista.
                defaultOpen={parameters.focus === expense.id}
                expense={{
                  amount: expense.amount,
                  categoryLabel: categoryLabels.get(expense.category) ?? "Outros",
                  clientName: expense.clients?.name,
                  description: expense.description,
                  documents: (expense.fiscal_documents ?? []).map((document) => ({
                    createdAt: document.created_at,
                    id: document.id,
                    mimeType: document.mime_type,
                    sizeBytes: document.size_bytes,
                  })),
                  dueDate: expense.due_date,
                  entityName: expense.client_entities?.display_name,
                  expenseType: expense.expense_type,
                  id: expense.id,
                  monthly:
                    expense.expense_type === "fixed" &&
                    Boolean(expense.recurrence_group_id) &&
                    expense.recurrence_frequency === "monthly",
                  paidAt: expense.paid_at,
                  recurrenceActive: Boolean(expense.recurrence_active),
                  status: expense.status,
                }}
                today={today}
              />
            </Fragment>
          ))}
        </RecordList>
      ) : (
        <section className="empty-state">
          <span className="empty-state__icon">
            <Icon name="wallet" />
          </span>
          <strong>Nenhuma despesa por aqui</strong>
          <p>
            {dueWindow === "next7"
              ? "Nenhuma despesa vence nos próximos 7 dias com os filtros atuais."
              : "Lance custos fixos ou avulsos pelo painel acima. Despesas mensais criam a próxima ocorrência ao serem pagas."}
          </p>
        </section>
      )}
      {totalPages > 1 ? (
        <nav
          aria-label="Paginação de despesas"
          className="mt-6 flex items-center justify-between gap-3 text-sm"
        >
          {page > 1 ? <Link href={expenseHref(page - 1)}>Anterior</Link> : <span />}
          <span>
            Página {Math.min(page, totalPages)} de {totalPages}
          </span>
          {page < totalPages ? <Link href={expenseHref(page + 1)}>Próxima</Link> : <span />}
        </nav>
      ) : null}
    </AccountShell>
  );
}
