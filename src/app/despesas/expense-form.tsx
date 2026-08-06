"use client";

import { useActionState } from "react";

import { createExpense } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField, type ClientOption } from "@/components/ui/form-controls";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

const expenseTypeOptions = [
  { description: "Repete todo mês, como aluguel ou assinatura", label: "Fixa", value: "fixed" },
  { description: "Muda de valor ou acontece uma vez só", label: "Variável", value: "variable" },
];

const statusOptions = [
  { description: "Ainda vai ser paga", label: "Pendente", value: "pending" },
  { description: "Já foi paga", label: "Paga", value: "paid" },
];

export function ExpenseForm({
  categoryOptions,
  clients,
  today,
}: {
  categoryOptions: { label: string; value: string }[];
  clients: ClientOption[];
  today: string;
}) {
  const [state, formAction] = useActionState(createExpense, initialActionState);
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);

  return (
    <form action={formAction} className="form-grid mt-4 sm:grid-cols-2">
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      <label className="field sm:col-span-2">
        <span className="field__label">Descrição</span>
        <input
          aria-invalid={Boolean(errors.description)}
          defaultValue={sent.text("description")}
          maxLength={200}
          name="description"
          placeholder="Ex.: Hospedagem do site"
          required
        />
        <FieldError message={errors.description} />
      </label>
      <SelectField
        defaultValue={sent.text("category", "other")}
        hint={
          <FieldHint>
            Serve para agrupar as despesas nos relatórios. Na dúvida, use “Outros”.
          </FieldHint>
        }
        label="Categoria"
        name="category"
        options={categoryOptions}
      />
      <SelectField
        defaultValue={sent.text("expenseType", "fixed")}
        hint={
          <FieldHint>
            Fixa é o que se repete todo mês, como aluguel. Variável muda de valor ou acontece uma
            vez só.
          </FieldHint>
        }
        label="Tipo"
        name="expenseType"
        options={expenseTypeOptions}
      />
      <label className="field">
        <span className="field__label">Valor</span>
        {/* Obrigatório de verdade: o schema recusa despesa sem valor, então avisar em vez
            de barrar só devolveria o formulário com um erro que o browser já evitaria. */}
        <input
          aria-invalid={Boolean(errors.amount)}
          defaultValue={sent.text("amount")}
          min="0.01"
          name="amount"
          placeholder="Ex.: 89,90"
          required
          step="0.01"
          type="number"
        />
        <FieldError message={errors.amount} />
      </label>
      <DateField
        defaultValue={sent.text("dueDate", today)}
        error={errors.dueDate}
        label="Vencimento ou data"
        name="dueDate"
        required
      />
      <SelectField
        defaultValue={sent.text("status", "pending")}
        hint={
          <FieldHint>
            “Paga” registra o pagamento na data informada acima, e não na data de hoje.
          </FieldHint>
        }
        label="Status"
        name="status"
        options={statusOptions}
      />
      <ClientCombobox clients={clients} defaultFilter="all" label="Cliente" optional />
      <label className="field sm:col-span-2">
        <span className="field__label">
          Observações <span className="field__optional">opcional</span>
        </span>
        <textarea
          defaultValue={sent.text("notes")}
          maxLength={5000}
          name="notes"
          placeholder="Contrato, forma de pagamento, o que mais ajudar depois"
        />
      </label>
      <div className="sm:col-span-2">
        <SubmitButton idleLabel="Criar despesa" />
      </div>
    </form>
  );
}
