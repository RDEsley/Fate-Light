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
 * Cobrança manual no contexto do cliente. Nunca grava `client_service_id`:
 * vínculo com serviço só orienta a UX; a agenda automática do serviço não avança.
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
  const contextService = services.find((service) => service.id === defaultServiceId);
  const defaultDescription = contextService
    ? `Ajuste — ${contextService.name}`
    : "";

  return (
    <form action={formAction} className="form-grid mt-4 sm:grid-cols-2">
      <input name="clientId" type="hidden" value={clientId} />
      <input name="returnTo" type="hidden" value={destination} />
      {/* Manual nunca entra na agenda: o RPC de baixa só avança ciclo com client_service_id. */}
      <input name="clientServiceId" type="hidden" value="" />
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      {contextService ? (
        <p className="helper-note sm:col-span-2" role="note">
          Contexto: serviço <strong>{contextService.name}</strong>. Esta cobrança é avulsa e{" "}
          <strong>não altera a agenda automática</strong> do serviço.
        </p>
      ) : null}
      <label className="field sm:col-span-2">
        <span className="field__label">Descrição</span>
        <input
          aria-invalid={Boolean(errors.description)}
          defaultValue={sent.text("description", defaultDescription)}
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
