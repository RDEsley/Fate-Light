import {
  deleteOperationalRecord,
  deletePaidFinancialRecord,
  markExpensePaid,
  stopExpenseRecurrence,
} from "@/app/_actions/mvp";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FiscalDocumentPanel,
  type FiscalDocumentItem,
} from "@/components/ui/fiscal-document-panel";
import { RecordCell, RecordRow } from "@/components/ui/record-row";
import { daysBetween, formatCurrency, formatDatePtBr } from "@/features/mvp/format";

/** Colunas da lista de despesas em tela larga; a lista e as linhas usam a mesma medida. */
export const expenseColumns = "minmax(0, 1fr) 7.5rem 5.5rem 6.25rem 8rem 5.5rem 1rem";
export const expenseColumnLabels = ["Despesa", "Vencimento", "Tipo", "Situação", "Valor", "", ""];

export type ExpenseRowData = {
  amount: number | string;
  categoryLabel: string;
  clientName?: string | null;
  description: string;
  documents?: FiscalDocumentItem[];
  dueDate: string;
  entityName?: string | null;
  expenseType: string;
  id: string;
  /** Faz parte de uma série mensal (fixa com recorrência). */
  monthly: boolean;
  paidAt?: string | null;
  recurrenceActive: boolean;
  status: string;
};

/**
 * Uma despesa em uma linha, no mesmo formato das cobranças: pagar fica a um clique (com
 * confirmação, porque em série mensal o pagamento já agenda a próxima) e o resto mora
 * nos detalhes.
 */
export function ExpenseRow({
  defaultOpen = false,
  expense,
  today,
}: {
  defaultOpen?: boolean;
  expense: ExpenseRowData;
  today: string;
}) {
  const paid = expense.status === "paid";
  const overdue = !paid && expense.dueDate < today;
  const lateDays = overdue ? daysBetween(expense.dueDate, today) : 0;
  const owner = [expense.categoryLabel, expense.clientName, expense.entityName]
    .filter(Boolean)
    .join(" · ");
  const seriesRunning = expense.monthly && expense.recurrenceActive;

  return (
    <RecordRow
      amount={formatCurrency(expense.amount)}
      cells={
        <>
          <RecordCell
            label="Vencimento"
            note={lateDays > 0 ? `há ${lateDays} ${lateDays === 1 ? "dia" : "dias"}` : undefined}
          >
            {formatDatePtBr(expense.dueDate)}
          </RecordCell>
          <RecordCell label="Tipo">{expense.monthly ? "Mensal" : "Avulsa"}</RecordCell>
        </>
      }
      defaultOpen={defaultOpen}
      id={`expense-${expense.id}`}
      quickAction={
        paid ? null : (
          <form action={markExpensePaid}>
            <input name="id" type="hidden" value={expense.id} />
            <ConfirmDialog
              className="button button--primary button--small"
              confirmLabel="Marcar como paga"
              confirmation={
                seriesRunning
                  ? `${formatCurrency(expense.amount)} · o pagamento é registrado hoje e a próxima ocorrência mensal é criada automaticamente.`
                  : `${formatCurrency(expense.amount)} · o pagamento é registrado com a data de hoje.`
              }
              icon="wallet"
              label="Pagar"
              title={`Pagar ${expense.description}`}
              tone="default"
              triggerLabel={`Pagar ${expense.description}`}
            />
          </form>
        )
      }
      status={
        <span
          className={`charge-status charge-status--${paid ? "paid" : overdue ? "overdue" : "pending"}`}
        >
          {paid ? "Paga" : overdue ? "Vencida" : "Pendente"}
        </span>
      }
      subtitle={owner}
      title={expense.description}
      tone={paid ? "positive" : overdue ? "danger" : "warning"}
    >
      <dl className="record-facts">
        <div>
          <dt>Valor</dt>
          <dd className="font-black">{formatCurrency(expense.amount)}</dd>
        </div>
        <div>
          <dt>Natureza</dt>
          <dd>{expense.expenseType === "fixed" ? "Fixa" : "Variável"}</dd>
        </div>
        <div>
          <dt>Recorrência</dt>
          <dd>
            {expense.monthly
              ? expense.recurrenceActive
                ? "Série mensal ativa"
                : "Série mensal encerrada"
              : "Não se repete"}
          </dd>
        </div>
        {paid ? (
          <div>
            <dt>Pagamento</dt>
            <dd>{expense.paidAt ? formatDatePtBr(expense.paidAt) : "Registrado"}</dd>
          </div>
        ) : null}
      </dl>

      {paid ? (
        <FiscalDocumentPanel
          documents={expense.documents ?? []}
          entityId={expense.id}
          entityType="expense"
        />
      ) : null}

      <div className="record-actions">
        {seriesRunning ? (
          <form action={stopExpenseRecurrence}>
            <input name="id" type="hidden" value={expense.id} />
            <ConfirmDialog
              className="service-action"
              confirmLabel="Parar recorrência"
              confirmation="As próximas ocorrências deixam de ser criadas automaticamente. O histórico já lançado permanece."
              icon="pause"
              label="Parar mensal"
              title={expense.description}
              tone="default"
              triggerIcon="pause"
            />
          </form>
        ) : null}
        {paid ? (
          <form action={deletePaidFinancialRecord}>
            <input name="id" type="hidden" value={expense.id} />
            <input name="recordType" type="hidden" value="expense" />
            <input name="returnTo" type="hidden" value="/despesas" />
            <ConfirmDialog
              className="service-action service-action--danger"
              confirmLabel="Excluir despesa paga"
              confirmation="O valor sai do dashboard e do histórico. Notas fiscais anexadas são removidas. Esta ação é irreversível."
              holdSeconds={3}
              icon="trash"
              label="Excluir paga"
              title={expense.description}
              triggerIcon="trash"
            />
          </form>
        ) : (
          <form action={deleteOperationalRecord}>
            <input name="clientId" type="hidden" value="" />
            <input name="id" type="hidden" value={expense.id} />
            <input name="recordType" type="hidden" value="expense" />
            <ConfirmDialog
              className="service-action service-action--danger"
              confirmLabel="Excluir despesa"
              confirmation={
                seriesRunning
                  ? "Esta ocorrência some e a recorrência mensal para. O histórico já pago permanece."
                  : "A despesa ainda não paga some do sistema sem deixar registro."
              }
              icon="trash"
              label="Excluir"
              title={expense.description}
              triggerIcon="trash"
            />
          </form>
        )}
      </div>
    </RecordRow>
  );
}
