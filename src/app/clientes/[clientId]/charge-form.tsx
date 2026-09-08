"use client";

import { useActionState } from "react";

import { createCharge } from "@/app/_actions/mvp";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { DateField } from "@/components/ui/form-controls";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

import { SubmitButton } from "../../_components/submit-button";

const paymentMethods = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];
const paymentOptions = paymentMethods.map((method) => ({ label: method, value: method }));

const additionalNatureOptions = [
  { description: "Soma na sua receita", label: "É minha receita", value: "revenue" },
  {
    description: "Dinheiro de terceiro; fica fora da receita",
    label: "É repasse",
    value: "passthrough",
  },
];

/**
 * Cobrança no contexto do cliente. `clientId` vem oculto; serviços opcionais são só
 * deste cliente. O formulário é client component por causa do `useActionState`.
 */
export function ChargeForm({
  clientId,
  defaultServiceId,
  returnTo,
  services,
}: {
  clientId: string;
  defaultServiceId?: string;
  returnTo?: string;
  services: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(createCharge, initialActionState);
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);
  const destination = returnTo ?? `/clientes/${clientId}`;

  return (
    <form action={formAction} className="form-grid mt-4 sm:grid-cols-2">
      <input name="clientId" type="hidden" value={clientId} />
      <input name="returnTo" type="hidden" value={destination} />
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      {services.length ? (
        <SelectField
          defaultValue={defaultServiceId ?? ""}
          label="Serviço vinculado"
          name="clientServiceId"
          optional
          options={[
            { description: "Cobrança independente", label: "Sem vínculo", value: "" },
            ...services.map((service) => ({
              label: service.name,
              value: service.id,
            })),
          ]}
          placeholder="Sem vínculo"
        />
      ) : (
        <input name="clientServiceId" type="hidden" value="" />
      )}
      <label className="field sm:col-span-2">
        <span className="field__label">Descrição</span>
        <input
          aria-invalid={Boolean(errors.description)}
          defaultValue={sent.text("description")}
          maxLength={200}
          name="description"
          placeholder="Ex.: Gestão de tráfego — agosto"
        />
        <FieldError message={errors.description} />
      </label>
      <MoneyField
        defaultValue={sent.text("companyRevenue")}
        error={errors.companyRevenue}
        hint="O que fica com você. É este valor que entra nos relatórios de faturamento."
        label="Receita própria"
        name="companyRevenue"
      />
      <MoneyField
        defaultValue={sent.text("mediaBudget")}
        error={errors.mediaBudget}
        hint="Dinheiro do cliente que só passa por você para virar anúncio. Não conta como sua receita."
        label="Verba de mídia"
        name="mediaBudget"
        optional
      />
      <MoneyField
        defaultValue={sent.text("additionalFee")}
        error={errors.additionalFee}
        hint="Valor extra desta cobrança. Marque ao lado se ele é seu ou se é repasse a terceiro — só o seu entra na receita."
        label="Adicional"
        name="additionalFee"
        optional
      />
      <SelectField
        defaultValue={sent.text("additionalFeeNature", "revenue")}
        label="O adicional é"
        name="additionalFeeNature"
        options={additionalNatureOptions}
      />
      <DateField
        defaultValue={sent.text("dueDate")}
        error={errors.dueDate}
        label="Vencimento"
        name="dueDate"
        required
      />
      <div className="option-card sm:col-span-2">
        <label className="option-card__toggle">
          <input defaultChecked={sent.checkbox("alreadyPaid")} name="alreadyPaid" type="checkbox" />
          <span>
            <strong>Esta cobrança já foi paga</strong>
            <small>
              Para registrar algo que aconteceu antes de você usar o sistema. Entra direto como
              quitada, na data de vencimento informada.
            </small>
          </span>
        </label>
        <div className="mt-3">
          <SelectField
            defaultValue={sent.text("paymentMethod", "Pix")}
            hint={
              <FieldHint>
                Só é usada quando a caixa acima está marcada. Sem ela, a cobrança nasce pendente e
                você escolhe a forma de pagamento na hora de receber.
              </FieldHint>
            }
            label="Forma de pagamento"
            name="paymentMethod"
            options={paymentOptions}
          />
          <FieldError message={errors.paymentMethod} />
        </div>
      </div>
      <label className="field sm:col-span-2">
        <span className="field__label">
          Observações <span className="field__optional">opcional</span>
        </span>
        <textarea defaultValue={sent.text("notes")} maxLength={5000} name="notes" />
      </label>
      <div className="sm:col-span-2">
        <SubmitButton idleLabel="Criar cobrança" />
      </div>
    </form>
  );
}
