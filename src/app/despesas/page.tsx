import type { Metadata } from "next";
import Link from "next/link";

import {
  deleteOperationalRecord,
  deletePaidFinancialRecord,
  markExpensePaid,
  stopExpenseRecurrence,
} from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FiscalDocumentPanel } from "@/components/ui/fiscal-document-panel";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "Despesas" };
const pageSize = 40;

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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; state?: string; status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const state = ["pending", "paid"].includes(parameters.state ?? "") ? parameters.state! : "all";
  const page = Math.max(1, Number.parseInt(parameters.page ?? "1", 10) || 1);
  const firstRow = (page - 1) * pageSize;
  let expensesRequest = context.supabase
    .from("expenses")
    .select(
      "id, description, category, amount, due_date, status, paid_at, expense_type, recurrence_active, recurrence_frequency, recurrence_group_id, clients(name), fiscal_documents(id, created_at, mime_type, size_bytes)",
      { count: "exact" },
    )
    .eq("workspace_id", context.workspaceId)
    .order("due_date", { ascending: false })
    .range(firstRow, firstRow + pageSize - 1);
  if (query) expensesRequest = expensesRequest.ilike("description", `%${query}%`);
  if (state !== "all") expensesRequest = expensesRequest.eq("status", state);
  const [{ data: clients }, { data: expenses, error, count }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    expensesRequest,
  ]);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const expenseHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (state !== "all") next.set("state", state);
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
      <form className="panel-card mb-4 flex flex-col gap-3 p-3! sm:flex-row" method="get">
        <label className="relative flex-1">
          <span className="sr-only">Buscar despesas</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <input
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Buscar por descrição..."
            type="search"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por status</span>
          <select
            className="min-h-11 w-full rounded-xl px-3 text-sm sm:w-40"
            defaultValue={state}
            name="state"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagas</option>
          </select>
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 text-sm font-black"
          type="submit"
        >
          Filtrar
        </button>
      </form>
      <details className="panel-card form-disclosure mb-5">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-negative-soft text-negative grid size-9 place-items-center rounded-xl">
              <Icon className="size-4" name="plus" />
            </span>
            Nova despesa
          </span>
          <span className="text-muted flex items-center gap-1 text-xs">
            <span className="form-disclosure__closed-label">Abrir formulário</span>
            <span className="form-disclosure__open-label">Fechar formulário</span>
            <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
          </span>
        </summary>
        <ExpenseForm
          categoryOptions={categoryOptions}
          clients={(clients ?? []).map((client) => ({
            id: client.id,
            name: client.name,
            status: client.commercial_status,
            tradeName: client.trade_name,
          }))}
        />
      </details>
      {error ? (
        <p role="alert">Não foi possível carregar as despesas.</p>
      ) : expenses?.length ? (
        <div className="charge-list">
          {expenses.map((expense) => {
            const monthly =
              expense.expense_type === "fixed" &&
              Boolean(expense.recurrence_group_id) &&
              expense.recurrence_frequency === "monthly";
            return (
              <article className="charge-card" key={expense.id}>
                <div className="charge-card__head">
                  <div className="min-w-0">
                    <h2>{expense.description}</h2>
                    <p>
                      {categories.find(([value]) => value === expense.category)?.[1]} ·{" "}
                      {expense.clients?.name ?? "Sem cliente"} · {formatDatePtBr(expense.due_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={`charge-status ${monthly ? "charge-status--pending" : "charge-status--cancelled"}`}
                    >
                      {monthly ? "Mensal" : "Avulsa"}
                    </span>
                    <span
                      className={`charge-status charge-status--${expense.status === "paid" ? "paid" : "pending"}`}
                    >
                      {expense.status === "paid" ? "Paga" : "Pendente"}
                    </span>
                  </div>
                </div>
                <dl className="charge-card__values">
                  <div>
                    <dt>Valor</dt>
                    <dd
                      className={`font-black ${expense.status === "paid" ? "text-positive" : "text-negative"}`}
                    >
                      {formatCurrency(expense.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt>Tipo</dt>
                    <dd>{expense.expense_type === "fixed" ? "Fixa" : "Variável"}</dd>
                  </div>
                </dl>
                {expense.status === "pending" ? (
                  <div className="charge-card__actions">
                    <form action={markExpensePaid} className="charge-settle">
                      <input name="id" type="hidden" value={expense.id} />
                      <SubmitButton idleLabel="Marcar como paga" pendingLabel="Registrando…" />
                    </form>
                    <div className="charge-card__secondary">
                      {monthly && expense.recurrence_active ? (
                        <form action={stopExpenseRecurrence}>
                          <input name="id" type="hidden" value={expense.id} />
                          <ConfirmDialog
                            className="charge-action"
                            confirmLabel="Parar recorrência"
                            confirmation="As próximas ocorrências deixam de ser criadas automaticamente. O histórico já lançado permanece."
                            icon="pause"
                            label="Parar mensal"
                            title={expense.description}
                            tone="default"
                          />
                        </form>
                      ) : null}
                      <form action={deleteOperationalRecord}>
                        <input name="clientId" type="hidden" value="" />
                        <input name="id" type="hidden" value={expense.id} />
                        <input name="recordType" type="hidden" value="expense" />
                        <ConfirmDialog
                          className="charge-action charge-action--danger"
                          confirmLabel="Excluir despesa"
                          confirmation="A despesa ainda não paga some do sistema sem deixar registro."
                          icon="trash"
                          label="Excluir"
                          title={expense.description}
                        />
                      </form>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="charge-card__footnote">
                      <Icon className="size-4" name="check" />{" "}
                      {expense.paid_at
                        ? `Paga em ${new Date(expense.paid_at).toLocaleString("pt-BR")}`
                        : "Paga"}
                      {monthly && expense.recurrence_active
                        ? " · série mensal ativa"
                        : monthly
                          ? " · série mensal encerrada"
                          : ""}
                    </p>
                    <FiscalDocumentPanel
                      documents={(expense.fiscal_documents ?? []).map((document) => ({
                        createdAt: document.created_at,
                        id: document.id,
                        mimeType: document.mime_type,
                        sizeBytes: document.size_bytes,
                      }))}
                      entityId={expense.id}
                      entityType="expense"
                    />
                    <div className="charge-card__actions mt-3">
                      {monthly && expense.recurrence_active ? (
                        <form action={stopExpenseRecurrence}>
                          <input name="id" type="hidden" value={expense.id} />
                          <ConfirmDialog
                            className="charge-action"
                            confirmLabel="Parar recorrência"
                            confirmation="As próximas ocorrências deixam de ser criadas automaticamente. O histórico já lançado permanece."
                            icon="pause"
                            label="Parar mensal"
                            title={expense.description}
                            tone="default"
                          />
                        </form>
                      ) : null}
                      <form action={deletePaidFinancialRecord}>
                        <input name="id" type="hidden" value={expense.id} />
                        <input name="recordType" type="hidden" value="expense" />
                        <input name="returnTo" type="hidden" value="/despesas" />
                        <ConfirmDialog
                          className="charge-action charge-action--danger"
                          confirmLabel="Excluir despesa paga"
                          confirmation="O valor sai do dashboard e do histórico. Notas fiscais anexadas são removidas. Esta ação é irreversível."
                          holdSeconds={3}
                          icon="trash"
                          label="Excluir paga"
                          title={expense.description}
                        />
                      </form>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhuma despesa</h2>
          <p className="text-muted mt-2">
            Lance custos fixos ou avulsos pelo formulário acima. Despesas mensais criam a próxima
            ocorrência ao serem marcadas como pagas.
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
