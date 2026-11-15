"use client";

import { useActionState, useState } from "react";

import { updateExpense } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

export type EditableExpense = {
  amount: number | string;
  category: string;
  description: string;
  dueDate: string;
  id: string;
  /** Série mensal ativa: a próxima ocorrência herda valor e dia desta. */
  monthly: boolean;
  notes?: string | null;
};

/**
 * Correção de uma despesa ainda não paga, sem sair da lista. Tipo, cliente e recorrência
 * ficam de fora: mudá-los muda a natureza do lançamento, não corrige um dado.
 */
export function EditExpenseButton({
  categoryOptions,
  expense,
}: {
  categoryOptions: { label: string; value: string }[];
  expense: EditableExpense;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Editar ${expense.description}`}
        className="service-action"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Icon className="size-4" name="edit" /> Editar
      </button>
      <Modal
        description="Corrija vencimento, valor, categoria ou descrição desta despesa a pagar."
        icon="edit"
        onClose={() => setOpen(false)}
        open={open}
        title={`Editar ${expense.description}`}
      >
        {open ? (
          <EditExpenseForm
            categoryOptions={categoryOptions}
            expense={expense}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </Modal>
    </>
  );
}

function EditExpenseForm({
  categoryOptions,
  expense,
  onCancel,
}: {
  categoryOptions: { label: string; value: string }[];
  expense: EditableExpense;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(updateExpense, initialActionState);
  const sent = submittedValues(state);

  return (
    <Form action={formAction} className="grid gap-4" state={state}>
      <input name="id" type="hidden" value={expense.id} />

      {expense.monthly ? (
        <p className="helper-note" role="note">
          <Icon className="size-4" name="info" />
          <span>
            Despesa de uma série mensal: a <strong>próxima ocorrência</strong> nasce com o valor e o
            dia desta quando ela for paga.
          </span>
        </p>
      ) : null}

      <div className="form-grid sm:grid-cols-2">
        <TextField
          className="sm:col-span-2"
          defaultValue={sent.text("description", expense.description)}
          label="Descrição"
          maxLength={200}
          minLength={2}
          name="description"
          required
        />
        <MoneyField
          defaultValue={sent.text("amount", String(expense.amount))}
          label="Valor"
          name="amount"
          required
        />
        <DateField
          defaultValue={sent.text("dueDate", expense.dueDate)}
          label="Vencimento"
          name="dueDate"
          required
        />
        <SelectField
          className="sm:col-span-2"
          defaultValue={sent.text("category", expense.category)}
          label="Categoria"
          name="category"
          options={categoryOptions}
        />
        <TextField
          className="sm:col-span-2"
          defaultValue={sent.text("notes", expense.notes ?? "")}
          label="Observações"
          maxLength={5000}
          multiline
          name="notes"
          optional
          rows={3}
        />
      </div>

      <div className="modal-panel__actions -mx-[1.15rem] mt-1 -mb-[0.35rem]">
        <button className="modal-cancel" onClick={onCancel} type="button">
          Voltar
        </button>
        <SubmitButton idleLabel="Salvar alterações" pendingLabel="Salvando…" />
      </div>
    </Form>
  );
}
