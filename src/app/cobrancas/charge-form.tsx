"use client";

import { useActionState } from "react";

import { createCharge } from "@/app/_actions/mvp";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField, type ClientOption } from "@/components/ui/form-controls";
import { SelectField } from "@/components/ui/select-field";
import { SoftSubmitButton } from "@/components/ui/soft-submit-button";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

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
 * Cobrança avulsa. É client component por causa do `useActionState`: recusar no servidor
 * e redirecionar apagava os dez campos por causa de um só, e este é o formulário mais
 * longo que o usuário preenche à mão.
 */
export function ChargeForm({
  clients,
  defaultClientId,
  defaultServiceId,
  services,
}: {
  clients: ClientOption[];
  defaultClientId?: string;
  defaultServiceId?: string;
  services: { clientName?: string; id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(createCharge, initialActionState);
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);

  return (
    <form action={formAction} className="form-grid mt-4 sm:grid-cols-2">
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      <ClientCombobox clients={clients} defaultValue={defaultClientId} />
      <SelectField
        defaultValue={defaultServiceId ?? ""}
        label="Serviço vinculado"
        name="clientServiceId"
        optional
        options={[
          { description: "Cobrança independente", label: "Sem vínculo", value: "" },
          ...services.map((service) => ({
            description: service.clientName,
            label: service.name,
            value: service.id,
          })),
        ]}
        placeholder="Sem vínculo"
      />
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
      <DateField
        defaultValue={sent.text("dueDate")}
        error={errors.dueDate}
        label="Vencimento"
        name="dueDate"
        required
      />
      <label className="field">
        <span className="field__label">
          Receita própria
          <FieldHint>
            O que fica com você. É este valor que entra nos relatórios de faturamento.
          </FieldHint>
        </span>
        <input
          aria-invalid={Boolean(errors.companyRevenue)}
          defaultValue={sent.text("companyRevenue")}
          min="0"
          name="companyRevenue"
          placeholder="Ex.: 1500,00"
          step="0.01"
          type="number"
        />
        <FieldError message={errors.companyRevenue} />
      </label>
      <label className="field">
        <span className="field__label">
          Verba de mídia <span className="field__optional">opcional</span>
          <FieldHint>
            Dinheiro do cliente que só passa por você para virar anúncio. Não conta como sua
            receita.
          </FieldHint>
        </span>
        <input
          defaultValue={sent.text("mediaBudget")}
          min="0"
          name="mediaBudget"
          placeholder="Ex.: 800,00"
          step="0.01"
          type="number"
        />
        <FieldError message={errors.mediaBudget} />
      </label>
      <label className="field">
        <span className="field__label">
          Adicional <span className="field__optional">opcional</span>
          <FieldHint>
            Valor extra desta cobrança. Marque ao lado se ele é seu ou se é repasse a terceiro — só
            o seu entra na receita.
          </FieldHint>
        </span>
        <input
          defaultValue={sent.text("additionalFee")}
          min="0"
          name="additionalFee"
          placeholder="Ex.: 120,00"
          step="0.01"
          type="number"
        />
        <FieldError message={errors.additionalFee} />
      </label>
      <SelectField
        defaultValue={sent.text("additionalFeeNature", "revenue")}
        label="O adicional é"
        name="additionalFeeNature"
        options={additionalNatureOptions}
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
        <SoftSubmitButton
          idleLabel="Criar cobrança"
          requirements={[
            { message: "Descreva a cobrança para reconhecê-la depois.", name: "description" },
            {
              message: "Todos os valores estão zerados — a cobrança precisa de algum valor.",
              name: ["companyRevenue", "mediaBudget", "additionalFee"],
              warnOnZero: true,
            },
          ]}
        />
      </div>
    </form>
  );
}
