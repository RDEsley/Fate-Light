"use client";

import { useActionState, useState } from "react";

import { FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { IntegerField } from "@/components/ui/integer-field";
import { MoneyField } from "@/components/ui/money-field";
import { PercentField } from "@/components/ui/percent-field";
import { SelectField } from "@/components/ui/select-field";
import { billingFrequencies } from "@/features/mvp/recurrence";
import { initialActionState, submittedValues, type ActionState } from "@/lib/forms/action-state";

import { SubmitButton } from "../_components/submit-button";

const billingOptions = billingFrequencies.map(([value, label]) => ({ label, value }));

export type CatalogServiceValues = {
  default_adjustment_interval_months: number | null;
  default_adjustment_rate: number | string | null;
  default_billing_type: string;
  default_price: number | string;
  description: string | null;
  id: string;
  name: string;
};

export function ServiceCatalogForm({
  action,
  onCancel,
  service,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  onCancel?: () => void;
  service?: CatalogServiceValues;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const sent = submittedValues(state);
  const stored = (value: number | string | null | undefined) =>
    value === null || value === undefined ? "" : String(value);
  const interval = sent.text(
    "adjustmentIntervalMonths",
    stored(service?.default_adjustment_interval_months),
  );
  // Intervalo e porcentagem só valem juntos; a chave mostra os dois ou nenhum.
  const [adjustment, setAdjustment] = useState(Boolean(interval));

  return (
    <Form action={formAction} className="grid gap-4" state={state}>
      {service ? <input name="id" type="hidden" value={service.id} /> : null}

      <div className="form-grid sm:grid-cols-2 lg:grid-cols-12">
        <TextField
          className="sm:col-span-2 lg:col-span-6"
          defaultValue={sent.text("name", service?.name ?? "")}
          hint="Use um nome que você reconheceria em qualquer cliente: é por ele que o serviço é encontrado na hora de aplicar."
          label="Nome"
          maxLength={120}
          minLength={2}
          name="name"
          placeholder="Ex.: Gestão de Google Ads"
          required
        />
        <MoneyField
          className="lg:col-span-3"
          defaultValue={sent.text("defaultPrice", stored(service?.default_price) || "0")}
          hint="É só uma sugestão inicial. Ao aplicar o serviço em um cliente você pode mudar o valor sem afetar o catálogo nem os outros clientes."
          label="Valor padrão"
          name="defaultPrice"
          required
        />
        <SelectField
          className="lg:col-span-3"
          defaultValue={sent.text("billingType", service?.default_billing_type ?? "monthly")}
          label="Periodicidade"
          name="billingType"
          options={billingOptions}
        />
      </div>

      <ToggleCard
        checked={adjustment}
        description="Sugere a revisão do preço de tempos em tempos para quem usar este serviço."
        onCheckedChange={setAdjustment}
        title="Lembrete de reajuste"
      >
        {adjustment ? (
          <div className="form-grid sm:grid-cols-2">
            <IntegerField
              defaultValue={interval || "12"}
              label="A cada quantos meses"
              max={60}
              min={1}
              name="adjustmentIntervalMonths"
              required
            />
            <PercentField
              defaultValue={sent.text("adjustmentRate", stored(service?.default_adjustment_rate))}
              label="Reajuste sugerido (%)"
              name="adjustmentRate"
              required
            />
          </div>
        ) : null}
      </ToggleCard>
      {adjustment ? null : (
        <>
          <input name="adjustmentIntervalMonths" type="hidden" value="" />
          <input name="adjustmentRate" type="hidden" value="" />
        </>
      )}

      <TextField
        defaultValue={sent.text("description", service?.description ?? "")}
        label="Descrição"
        maxLength={3000}
        multiline
        name="description"
        optional
        placeholder="O que está incluso, para lembrar na hora de aplicar"
      />

      <FormActions>
        {onCancel ? (
          <button className="button button--secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={service ? "Salvar alterações" : "Criar serviço"} />
      </FormActions>
    </Form>
  );
}
