"use client";

import { useActionState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { SelectField } from "@/components/ui/select-field";
import { SoftSubmitButton } from "@/components/ui/soft-submit-button";
import { billingFrequencies } from "@/features/mvp/recurrence";
import { initialActionState, submittedValues, type ActionState } from "@/lib/forms/action-state";

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
      <label className="field">
        <span className="field__label">
          Valor padrão
          <FieldHint>
            É só uma sugestão inicial. Ao aplicar o serviço em um cliente você pode mudar o valor
            sem afetar o catálogo nem os outros clientes.
          </FieldHint>
        </span>
        <input
          aria-invalid={Boolean(errors.defaultPrice)}
          defaultValue={sent.text("defaultPrice", stored(service?.default_price))}
          min="0"
          name="defaultPrice"
          placeholder="Ex.: 1500,00"
          step="0.01"
          type="number"
        />
        <FieldError message={errors.defaultPrice} />
      </label>
      <SelectField
        defaultValue={sent.text("billingType", service?.default_billing_type ?? "monthly")}
        label="Periodicidade"
        name="billingType"
        options={billingOptions}
      />
      <label className="field">
        <span className="field__label">
          Reajuste a cada (meses) <span className="field__optional">opcional</span>
        </span>
        <input
          aria-invalid={Boolean(errors.adjustmentIntervalMonths)}
          defaultValue={sent.text(
            "adjustmentIntervalMonths",
            stored(service?.default_adjustment_interval_months),
          )}
          max="60"
          min="1"
          name="adjustmentIntervalMonths"
          type="number"
        />
        <FieldError message={errors.adjustmentIntervalMonths} />
      </label>
      <label className="field">
        <span className="field__label">
          Sugestão de reajuste (%) <span className="field__optional">opcional</span>
        </span>
        <input
          aria-invalid={Boolean(errors.adjustmentRate)}
          defaultValue={sent.text("adjustmentRate", stored(service?.default_adjustment_rate))}
          max="100"
          min="0"
          name="adjustmentRate"
          step="0.01"
          type="number"
        />
        <FieldError message={errors.adjustmentRate} />
      </label>
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
        <SoftSubmitButton
          idleLabel={service ? "Salvar alterações" : "Criar serviço"}
          requirements={[
            { message: "Dê um nome ao serviço.", name: "name" },
            {
              message: "O valor padrão está em branco. Você poderá ajustá-lo em cada cliente.",
              name: "defaultPrice",
            },
          ]}
        />
      </div>
    </form>
  );
}
