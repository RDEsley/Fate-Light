"use client";

import { useActionState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
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
  service,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  service?: CatalogServiceValues;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);
  const stored = (value: number | string | null | undefined) =>
    value === null || value === undefined ? "" : String(value);

  return (
    <form action={formAction} className="form-grid mt-3 sm:grid-cols-2">
      {service ? <input name="id" type="hidden" value={service.id} /> : null}
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      <label className="field">
        <span className="field__label">Nome</span>
        <input
          aria-invalid={Boolean(errors.name)}
          defaultValue={sent.text("name", service?.name ?? "")}
          maxLength={120}
          name="name"
          placeholder="Ex.: Gestão de Google Ads"
        />
        <FieldError message={errors.name} />
        <span className="field__hint">
          Nomes se repetem mal: use um nome que você reconheceria em qualquer cliente.
        </span>
      </label>
      <MoneyField
        defaultValue={sent.text("defaultPrice", stored(service?.default_price) || "0")}
        error={errors.defaultPrice}
        hint="É só uma sugestão inicial. Ao aplicar o serviço em um cliente você pode mudar o valor sem afetar o catálogo nem os outros clientes."
        label="Valor padrão"
        name="defaultPrice"
      />
      <SelectField
        defaultValue={sent.text("billingType", service?.default_billing_type ?? "monthly")}
        label="Periodicidade"
        name="billingType"
        options={billingOptions}
      />
      <IntegerField
        defaultValue={sent.text(
          "adjustmentIntervalMonths",
          stored(service?.default_adjustment_interval_months),
        )}
        error={errors.adjustmentIntervalMonths}
        label="Reajuste a cada (meses)"
        max={60}
        min={1}
        name="adjustmentIntervalMonths"
        optional
      />
      <PercentField
        defaultValue={sent.text("adjustmentRate", stored(service?.default_adjustment_rate))}
        error={errors.adjustmentRate}
        label="Sugestão de reajuste (%)"
        name="adjustmentRate"
        optional
      />
      <label className="field sm:col-span-2">
        <span className="field__label">
          Descrição <span className="field__optional">opcional</span>
        </span>
        <textarea
          defaultValue={sent.text("description", service?.description ?? "")}
          maxLength={3000}
          name="description"
        />
        <FieldError message={errors.description} />
      </label>
      <div className="sm:col-span-2">
        <SubmitButton idleLabel={service ? "Salvar alterações" : "Criar serviço"} />
      </div>
    </form>
  );
}
