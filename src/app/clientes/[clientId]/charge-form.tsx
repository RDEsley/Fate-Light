"use client";

import { useActionState, useState } from "react";

import { createCharge } from "@/app/_actions/mvp";
import { FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField, EntitySelect, type ClientEntityOption } from "@/components/ui/form-controls";
import { FormMore } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { persistedToCents } from "@/features/mvp/money";
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

/** A cobrança precisa cobrar alguma coisa; o servidor repete a mesma regra. */
function validateCharge(formData: FormData): Record<string, string> {
  const total = ["companyRevenue", "mediaBudget", "additionalFee"].reduce(
    (sum, field) => sum + Number(formData.get(field) || 0),
    0,
  );
  return total > 0
    ? {}
    : { companyRevenue: "Informe algum valor: receita, verba de mídia ou adicional." };
}

/**
 * Cobrança manual no contexto do cliente. Nunca grava `client_service_id`:
 * vínculo com serviço só orienta a UX; a agenda automática do serviço não avança.
 */
export function ChargeForm({
  clientId,
  defaultEntityId,
  defaultServiceId,
  entities = [],
  returnTo,
  services,
}: {
  clientId: string;
  defaultEntityId?: string;
  defaultServiceId?: string;
  entities?: ClientEntityOption[];
  returnTo?: string;
  services: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(createCharge, initialActionState);
  const sent = submittedValues(state);
  const destination = returnTo ?? `/clientes/${clientId}`;
  const contextService = services.find((service) => service.id === defaultServiceId);
  const defaultDescription = contextService ? `Ajuste — ${contextService.name}` : "";
  const [alreadyPaid, setAlreadyPaid] = useState(sent.checkbox("alreadyPaid"));
  const [additionalCents, setAdditionalCents] = useState<number | null>(
    persistedToCents(sent.text("additionalFee")),
  );
  const hasEntities = entities.some((entity) => entity.clientId === clientId);
  const hasAdditional = additionalCents !== null && additionalCents > 0;

  return (
    <Form action={formAction} className="grid gap-4" state={state} validate={validateCharge}>
      <input name="clientId" type="hidden" value={clientId} />
      <input name="returnTo" type="hidden" value={destination} />
      {/* Manual nunca entra na agenda: o RPC de baixa só avança ciclo com client_service_id. */}
      <input name="clientServiceId" type="hidden" value="" />

      {contextService ? (
        <p className="helper-note" role="note">
          <Icon className="size-4" name="info" />
          <span>
            Contexto: serviço <strong>{contextService.name}</strong>. Esta cobrança é avulsa e{" "}
            <strong>não altera a agenda automática</strong> do serviço.
          </span>
        </p>
      ) : null}

      <div className="form-grid sm:grid-cols-2 lg:grid-cols-12">
        <TextField
          className={hasEntities ? "sm:col-span-2 lg:col-span-8" : "sm:col-span-2 lg:col-span-6"}
          defaultValue={sent.text("description", defaultDescription)}
          label="Descrição"
          maxLength={200}
          minLength={2}
          name="description"
          placeholder="Ex.: Ajuste pontual — agosto"
          required
        />
        <EntitySelect
          className="sm:col-span-2 lg:col-span-4"
          clientId={clientId}
          defaultValue={sent.text("clientEntityId", defaultEntityId ?? "")}
          entities={entities}
        />
        <MoneyField
          className={hasEntities ? "lg:col-span-6" : "lg:col-span-3"}
          defaultValue={sent.text("companyRevenue")}
          hint="O que fica com você. É este valor que entra nos relatórios de faturamento."
          label="Receita própria"
          name="companyRevenue"
        />
        <DateField
          className={hasEntities ? "lg:col-span-6" : "lg:col-span-3"}
          defaultValue={sent.text("dueDate")}
          label="Vencimento"
          name="dueDate"
          required
        />
      </div>

      <ToggleCard
        checked={alreadyPaid}
        description="Para registrar algo que já aconteceu. Entra quitada, na data de vencimento informada."
        name="alreadyPaid"
        onCheckedChange={setAlreadyPaid}
        title="Esta cobrança já foi paga"
      >
        {alreadyPaid ? (
          <SelectField
            defaultValue={sent.text("paymentMethod", "Pix")}
            label="Forma de pagamento"
            name="paymentMethod"
            options={paymentOptions}
          />
        ) : null}
      </ToggleCard>
      {alreadyPaid ? null : <input name="paymentMethod" type="hidden" value="Pix" />}

      <FormMore description="Verba de mídia, adicional e observações" title="Opções avançadas">
        <div className={`form-grid sm:grid-cols-2 ${hasAdditional ? "lg:grid-cols-3" : ""}`}>
          <MoneyField
            defaultValue={sent.text("mediaBudget")}
            hint="Dinheiro do cliente que só passa por você para virar anúncio. Não conta como sua receita."
            label="Verba de mídia"
            name="mediaBudget"
            optional
          />
          <MoneyField
            defaultValue={sent.text("additionalFee")}
            hint="Valor extra desta cobrança. Ao preencher, você escolhe se ele é seu ou repasse a terceiro — só o seu entra na receita."
            label="Adicional"
            name="additionalFee"
            onCentsChange={setAdditionalCents}
            optional
          />
          {hasAdditional ? (
            <SelectField
              className="sm:col-span-2 lg:col-span-1"
              defaultValue={sent.text("additionalFeeNature", "revenue")}
              label="O adicional é"
              name="additionalFeeNature"
              options={additionalNatureOptions}
            />
          ) : (
            <input name="additionalFeeNature" type="hidden" value="revenue" />
          )}
        </div>
        <TextField
          defaultValue={sent.text("notes")}
          label="Observações"
          maxLength={5000}
          multiline
          name="notes"
          optional
          rows={3}
        />
      </FormMore>

      <FormActions>
        <SubmitButton idleLabel="Criar cobrança avulsa" />
      </FormActions>
    </Form>
  );
}
