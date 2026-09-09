"use client";

import { useActionState, useState } from "react";

import { createExpense } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField, type ClientOption } from "@/components/ui/form-controls";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

const expenseTypeOptions = [
  {
    description: "Custo fixo. Você pode marcar para repetir todo mês ao pagar.",
    label: "Fixa",
    value: "fixed",
  },
  {
    description: "Muda de valor ou acontece uma vez só — sem recorrência automática.",
    label: "Variável / avulsa",
    value: "variable",
  },
];

const statusOptions = [
  { description: "Ainda vai ser paga", label: "Pendente", value: "pending" },
  { description: "Já foi paga", label: "Paga", value: "paid" },
];

export function ExpenseForm({
  categoryOptions,
  clients,
}: {
  categoryOptions: { label: string; value: string }[];
  clients: ClientOption[];
}) {
  const [state, formAction] = useActionState(createExpense, initialActionState);
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);
  const [expenseType, setExpenseType] = useState(sent.text("expenseType", "fixed"));

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
        hint={
          <FieldHint>
            Fixa é aluguel ou assinatura. Variável é avulsa ou muda de valor. A recorrência mensal
            só existe para despesas fixas e precisa ser ligada explicitamente.
          </FieldHint>
        }
        label="Tipo"
        name="expenseType"
        onValueChange={setExpenseType}
        options={expenseTypeOptions}
        value={expenseType}
      />
      <MoneyField
        defaultValue={sent.text("amount")}
        error={errors.amount}
        label="Valor"
        name="amount"
        required
      />
      <DateField
        defaultValue={sent.text("dueDate")}
        error={errors.dueDate}
        label="Vencimento ou data"
        name="dueDate"
        required
      />
      <SelectField
        defaultValue={sent.text("status", "pending")}
        hint={
          <FieldHint>
            “Paga” registra o pagamento na data informada acima, e não na data de hoje. Em despesa
            mensal, a próxima ocorrência nasce automaticamente após marcar como paga.
          </FieldHint>
        }
        label="Status"
        name="status"
        options={statusOptions}
      />
      <ClientCombobox clients={clients} defaultFilter="all" label="Cliente" optional />
      {expenseType === "fixed" ? (
        <div className="option-card sm:col-span-2">
          <label className="option-card__toggle">
            <input
              defaultChecked={sent.checkbox("enableRecurrence")}
              name="enableRecurrence"
              type="checkbox"
            />
            <span>
              <strong>Repetir todo mês</strong>
              <small>
                Ao marcar como paga, o sistema cria a próxima ocorrência com o mesmo valor. Você
                pode encerrar a série depois, sem apagar o histórico.
              </small>
            </span>
          </label>
          <FieldError message={errors.enableRecurrence} />
        </div>
      ) : null}
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
