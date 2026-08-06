import type { Metadata } from "next";

import { createExpense, deleteOperationalRecord, markExpensePaid } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Despesas" };

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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const state = ["pending", "paid"].includes(parameters.state ?? "") ? parameters.state! : "all";
  let expensesRequest = context.supabase
    .from("expenses")
    .select(
      "id, description, category, amount, due_date, status, paid_at, expense_type, clients(name)",
    )
    .eq("workspace_id", context.workspaceId)
    .order("due_date", { ascending: false })
    .limit(100);
  if (query) expensesRequest = expensesRequest.ilike("description", `%${query}%`);
  if (state !== "all") expensesRequest = expensesRequest.eq("status", state);
  const [{ data: clients }, { data: expenses, error }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    expensesRequest,
  ]);
  return (
    <AccountShell
      description="Registre custos pagos ou pendentes e relacione-os a um cliente quando necessário."
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
        <form action={createExpense} className="form-grid mt-4 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Descrição
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              maxLength={200}
              name="description"
              placeholder="Ex.: Hospedagem do site"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            <span className="flex items-center">
              Categoria
              <FieldHint>
                Serve para agrupar as despesas nos relatórios. Na dúvida, use “Outros”.
              </FieldHint>
            </span>
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              name="category"
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            <span className="flex items-center">
              Tipo
              <FieldHint>
                Fixa é o que se repete todo mês, como aluguel. Variável muda de valor ou acontece
                uma vez só.
              </FieldHint>
            </span>
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              name="expenseType"
            >
              <option value="fixed">Fixa</option>
              <option value="variable">Variável</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Valor
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              min="0.01"
              name="amount"
              placeholder="Ex.: 89,90"
              required
              step="0.01"
              type="number"
            />
          </label>
          <DateField defaultValue={isoToday()} label="Vencimento ou data" name="dueDate" required />
          <label className="text-sm font-semibold">
            Status
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              name="status"
            >
              <option value="pending">Pendente</option>
              <option value="paid">Paga</option>
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
            label="Cliente"
            optional
          />
          <label className="text-sm font-semibold sm:col-span-2">
            Observações
            <textarea
              className="border-line bg-canvas mt-2 min-h-24 w-full rounded-xl border px-4 py-3"
              maxLength={5000}
              name="notes"
            />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton idleLabel="Criar despesa" />
          </div>
        </form>
      </details>
      {error ? (
        <p role="alert">Não foi possível carregar as despesas.</p>
      ) : expenses?.length ? (
        <div className="space-y-4">
          {expenses.map((expense) => (
            <article
              className="cartoon-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
              key={expense.id}
            >
              <div>
                <h2 className="font-semibold">{expense.description}</h2>
                <p className="text-muted text-sm">
                  {categories.find(([value]) => value === expense.category)?.[1]} ·{" "}
                  {expense.expense_type === "fixed" ? "Fixa" : "Variável"} ·{" "}
                  {expense.clients?.name ?? "Sem cliente"} · {formatDatePtBr(expense.due_date)}
                </p>
                <p
                  className={`mt-2 font-black ${expense.status === "paid" ? "text-positive" : "text-negative"}`}
                >
                  {formatCurrency(expense.amount)} ·{" "}
                  {expense.status === "paid" ? "Paga" : "Pendente"}
                </p>
              </div>
              {expense.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <form action={markExpensePaid}>
                    <input name="id" type="hidden" value={expense.id} />
                    <SubmitButton idleLabel="Marcar como paga" />
                  </form>
                  <form action={deleteOperationalRecord}>
                    <input name="clientId" type="hidden" value="" />
                    <input name="id" type="hidden" value={expense.id} />
                    <input name="recordType" type="hidden" value="expense" />
                    <ConfirmDialog
                      className="danger-action"
                      confirmLabel="Excluir despesa"
                      confirmation="A despesa ainda não paga some do sistema sem deixar registro."
                      icon="trash"
                      label="Excluir"
                      title={expense.description}
                    />
                  </form>
                </div>
              ) : (
                <span className="text-muted text-sm">
                  {expense.paid_at ? new Date(expense.paid_at).toLocaleString("pt-BR") : ""}
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhuma despesa</h2>
        </section>
      )}
    </AccountShell>
  );
}
