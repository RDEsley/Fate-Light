"use client";

import { useActionState, useState } from "react";

import { updateCharge } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { persistedToCents } from "@/features/mvp/money";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

export type EditableCharge = {
  additionalFee: number | string;
  additionalFeeIsRevenue: boolean;
  /** Cobrança gerada por um serviço; no recorrente, remarcar o ciclo atual move a agenda. */
  clientServiceId?: string | null;
  companyRevenue: number | string;
  description: string;
  dueDate: string;
  id: string;
  mediaBudget: number | string;
  notes?: string | null;
};

const additionalNatureOptions = [
  { description: "Soma na sua receita", label: "É minha receita", value: "revenue" },
  {
    description: "Dinheiro de terceiro; fica fora da receita",
    label: "É repasse",
    value: "passthrough",
  },
];

/** Mesma regra do servidor: a cobrança precisa cobrar alguma coisa. */
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
 * Edição de uma cobrança pendente sem sair da lista. Cliente e situação ficam de fora:
 * pagar e cancelar têm fluxo próprio com histórico, e paga não é reescrita.
 */
export function EditChargeButton({
  charge,
  returnTo,
}: {
  charge: EditableCharge;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Editar ${charge.description}`}
        className="service-action"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Icon className="size-4" name="edit" /> Editar
      </button>
      <Modal
        description="Corrija vencimento, valores ou descrição desta cobrança pendente."
        icon="edit"
        onClose={() => setOpen(false)}
        open={open}
        title={`Editar ${charge.description}`}
      >
        {/* Montado só aberto: cada abertura começa dos valores atuais da cobrança. */}
        {open ? (
          <EditChargeForm charge={charge} onCancel={() => setOpen(false)} returnTo={returnTo} />
        ) : null}
      </Modal>
    </>
  );
}

function EditChargeForm({
  charge,
  onCancel,
  returnTo,
}: {
  charge: EditableCharge;
  onCancel: () => void;
  returnTo: string;
}) {
  const [state, formAction] = useActionState(updateCharge, initialActionState);
  const sent = submittedValues(state);
  const [additionalCents, setAdditionalCents] = useState<number | null>(
    persistedToCents(sent.text("additionalFee", String(charge.additionalFee))),
  );
  const hasAdditional = additionalCents !== null && additionalCents > 0;

  return (
    <Form action={formAction} className="grid gap-4" state={state} validate={validateCharge}>
      <input name="id" type="hidden" value={charge.id} />
      <input name="returnTo" type="hidden" value={returnTo} />

      {charge.clientServiceId ? (
        <p className="helper-note" role="note">
          <Icon className="size-4" name="info" />
          <span>
            Cobrança gerada por um serviço. Se ela é o ciclo atual de um serviço recorrente, o{" "}
            <strong>próximo vencimento do serviço</strong> acompanha a nova data e os ciclos
            seguintes passam a contar a partir dela.
          </span>
        </p>
      ) : null}

      <div className="form-grid sm:grid-cols-2">
        <TextField
          className="sm:col-span-2"
          defaultValue={sent.text("description", charge.description)}
          label="Descrição"
          maxLength={200}
          minLength={2}
          name="description"
          required
        />
        <DateField
          defaultValue={sent.text("dueDate", charge.dueDate)}
          label="Vencimento"
          name="dueDate"
          required
        />
        <MoneyField
          defaultValue={sent.text("companyRevenue", String(charge.companyRevenue))}
          hint="O que fica com você. É este valor que entra nos relatórios de faturamento."
          label="Receita própria"
          name="companyRevenue"
        />
        <MoneyField
          defaultValue={sent.text("mediaBudget", String(charge.mediaBudget))}
          hint="Dinheiro do cliente que só passa por você para virar anúncio. Não conta como sua receita."
          label="Verba de mídia"
          name="mediaBudget"
          optional
        />
        <MoneyField
          defaultValue={sent.text("additionalFee", String(charge.additionalFee))}
          hint="Valor extra desta cobrança. Você escolhe se ele é seu ou repasse a terceiro."
          label="Adicional"
          name="additionalFee"
          onCentsChange={setAdditionalCents}
          optional
        />
        {hasAdditional ? (
          <SelectField
            className="sm:col-span-2"
            defaultValue={sent.text(
              "additionalFeeNature",
              charge.additionalFeeIsRevenue ? "revenue" : "passthrough",
            )}
            label="O adicional é"
            name="additionalFeeNature"
            options={additionalNatureOptions}
          />
        ) : (
          <input
            name="additionalFeeNature"
            type="hidden"
            value={charge.additionalFeeIsRevenue ? "revenue" : "passthrough"}
          />
        )}
        <TextField
          className="sm:col-span-2"
          defaultValue={sent.text("notes", charge.notes ?? "")}
          label="Observações"
          maxLength={5000}
          multiline
          name="notes"
          optional
          rows={3}
        />
      </div>

      <div className="modal-panel__actions -mx-[1.15rem] mt-1 -mb-[0.35rem]">
        <button className="modal-cancel" onClick={onCancel} type="button">
          Voltar
        </button>
        <SubmitButton idleLabel="Salvar alterações" pendingLabel="Salvando…" />
      </div>
    </Form>
  );
}
