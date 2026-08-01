import type { Metadata } from "next";

import { createExpense, markExpensePaid } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { formatCurrency, isoToday } from "@/features/mvp/format";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const [{ data: clients }, { data: expenses, error }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("expenses")
      .select(
        "id, description, category, amount, due_date, status, paid_at, expense_type, clients(name)",
      )
      .eq("workspace_id", context.workspaceId)
      .order("due_date", { ascending: false })
      .limit(100),
  ]);
  return (
    <AccountShell
      description="Registre custos pagos ou pendentes e relacione-os a um cliente quando necessário."
      fullName={context.fullName}
      theme={context.theme}
      title="Despesas"
    >
      <MvpStatusMessage status={parameters.status} />
      <details className="border-line bg-surface mb-6 rounded-2xl border p-5">
        <summary className="cursor-pointer font-semibold">Nova despesa</summary>
        <form action={createExpense} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Descrição
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              maxLength={200}
              name="description"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Categoria
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
            Tipo
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
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm font-semibold">
            Vencimento ou data
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              defaultValue={isoToday()}
              name="dueDate"
              required
              type="date"
            />
          </label>
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
          <label className="text-sm font-semibold">
            Cliente opcional
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              name="clientId"
            >
              <option value="">Sem vínculo</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
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
              className="border-line bg-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
              key={expense.id}
            >
              <div>
                <h2 className="font-semibold">{expense.description}</h2>
                <p className="text-muted text-sm">
                  {categories.find(([value]) => value === expense.category)?.[1]} ·{" "}
                  {expense.expense_type === "fixed" ? "Fixa" : "Variável"} ·{" "}
                  {expense.clients?.name ?? "Sem cliente"}
                </p>
                <p className="mt-2 font-semibold">
                  {formatCurrency(expense.amount)} ·{" "}
                  {expense.status === "paid" ? "Paga" : "Pendente"}
                </p>
              </div>
              {expense.status === "pending" ? (
                <form action={markExpensePaid}>
                  <input name="id" type="hidden" value={expense.id} />
                  <SubmitButton idleLabel="Marcar como paga" />
                </form>
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
