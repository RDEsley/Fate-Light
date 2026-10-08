"use client";

import { useActionState, useState } from "react";

import { createExpense } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  ClientCombobox,
  DateField,
  EntitySelect,
  type ClientEntityOption,
  type ClientOption,
} from "@/components/ui/form-controls";
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
  entities = [],
}: {
  categoryOptions: { label: string; value: string }[];
  clients: ClientOption[];
  entities?: ClientEntityOption[];
}) {
  const [state, formAction] = useActionState(createExpense, initialActionState);
  const sent = submittedValues(state);
  const [expenseType, setExpenseType] = useState(sent.text("expenseType", "fixed"));
  // A empresa/marca depende do cliente escolhido, então o id vive aqui e não no combobox.
  const [clientId, setClientId] = useState(sent.text("clientId"));
  const hasEntities = Boolean(clientId) && entities.some((entity) => entity.clientId === clientId);

  return (
    <Form action={formAction} className="grid gap-4" state={state}>
      <div className="form-grid sm:grid-cols-2 lg:grid-cols-12">
        <TextField
          className="sm:col-span-2 lg:col-span-6"
          defaultValue={sent.text("description")}
          label="Descrição"
          maxLength={200}
          minLength={2}
          name="description"
          placeholder="Ex.: Hospedagem do site"
          required
        />
        <MoneyField
          className="lg:col-span-3"
          defaultValue={sent.text("amount")}
          label="Valor"
          name="amount"
          required
        />
        <DateField
          className="lg:col-span-3"
          defaultValue={sent.text("dueDate")}
          label="Vencimento ou data"
          name="dueDate"
          required
        />
        <SelectField
          className="lg:col-span-4"
          defaultValue={sent.text("category", "other")}
          hint="Serve para agrupar as despesas nos relatórios. Na dúvida, use “Outros”."
          label="Categoria"
          name="category"
          options={categoryOptions}
        />
        <SelectField
          className="lg:col-span-4"
          hint="Fixa é aluguel ou assinatura. Variável é avulsa ou muda de valor. Só a fixa pode repetir todo mês."
          label="Tipo"
          name="expenseType"
          onValueChange={setExpenseType}
          options={expenseTypeOptions}
          value={expenseType}
        />
        <SelectField
          className="sm:col-span-2 lg:col-span-4"
          defaultValue={sent.text("status", "pending")}
          hint="“Paga” registra o pagamento na data informada, não na de hoje. Em despesa mensal, a próxima ocorrência nasce ao marcar como paga."
          label="Status"
          name="status"
          options={statusOptions}
        />
        <ClientCombobox
          className={hasEntities ? "sm:col-span-2 lg:col-span-6" : "sm:col-span-2 lg:col-span-12"}
          clients={clients}
          defaultFilter="all"
          defaultValue={clientId}
          hint="Vincule quando o custo existe por causa de um cliente. Sem vínculo, vale como custo geral."
          label="Cliente"
          onSelect={(client) => setClientId(client?.id ?? "")}
          optional
        />
        <EntitySelect
          className="sm:col-span-2 lg:col-span-6"
          clientId={clientId || null}
          defaultValue={sent.text("clientEntityId")}
          entities={entities}
        />
      </div>

      {expenseType === "fixed" ? (
        <ToggleCard
          defaultChecked={sent.checkbox("enableRecurrence")}
          description="Ao marcar como paga, a próxima ocorrência é criada com o mesmo valor. Você pode encerrar a série depois."
          name="enableRecurrence"
          title="Repetir todo mês"
        />
      ) : null}

      <TextField
        defaultValue={sent.text("notes")}
        label="Observações"
        maxLength={5000}
        multiline
        name="notes"
        optional
        placeholder="Contrato, forma de pagamento, o que mais ajudar depois"
      />

      <FormActions>
        <SubmitButton idleLabel="Criar despesa" />
      </FormActions>
    </Form>
  );
}
