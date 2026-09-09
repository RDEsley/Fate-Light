"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { clientEntityTypeOptions } from "@/features/clients/entity-schemas";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

import { createClientEntity, updateClientEntity } from "./entity-actions";

export type ClientEntityValues = {
  displayName: string;
  email: string | null;
  entityType: string;
  id: string;
  legalName: string | null;
  notes: string | null;
  phone: string | null;
  taxId: string | null;
  website: string | null;
};

/**
 * Cadastro de empresa, marca ou projeto dentro de um cliente. Só o nome e o tipo ficam
 * visíveis de saída: dados fiscais e de contato são exceção e vivem atrás do disclosure.
 */
export function ClientEntityForm({
  clientId,
  entity,
  onCancel,
}: {
  clientId: string;
  entity?: ClientEntityValues;
  onCancel?: () => void;
}) {
  const editing = Boolean(entity);
  const [state, formAction] = useActionState(
    editing ? updateClientEntity : createClientEntity,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);
  const detailsError = Boolean(
    errors.legalName || errors.taxId || errors.website || errors.email || errors.phone,
  );

  return (
    <form action={formAction} className="form-grid mt-4 sm:grid-cols-2">
      <input name="clientId" type="hidden" value={clientId} />
      {entity ? <input name="entityId" type="hidden" value={entity.id} /> : null}
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      <label className="field">
        <span className="field__label">
          Nome da empresa ou marca
          <FieldHint>
            É este nome que aparece nos serviços, cobranças, despesas e domínios ligados a ela.
          </FieldHint>
        </span>
        <input
          aria-invalid={Boolean(errors.displayName)}
          defaultValue={sent.text("displayName", entity?.displayName ?? "")}
          maxLength={160}
          name="displayName"
          placeholder="Ex.: Padaria do Bairro"
          required
        />
        <FieldError message={errors.displayName} />
      </label>
      <SelectField
        defaultValue={sent.text("entityType", entity?.entityType ?? "company")}
        label="Tipo"
        name="entityType"
        options={clientEntityTypeOptions}
      />

      <details className="form-disclosure sm:col-span-2" open={detailsError}>
        <summary className="flex cursor-pointer items-center gap-1 text-sm font-semibold">
          Dados fiscais e de contato <span className="field__optional">opcional</span>
          <Icon className="form-disclosure__chevron ml-auto size-4" name="chevron-down" />
        </summary>
        <div className="form-grid mt-3 sm:grid-cols-2">
          <label className="field">
            <span className="field__label">
              Razão social <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={sent.text("legalName", entity?.legalName ?? "")}
              maxLength={200}
              name="legalName"
            />
            <FieldError message={errors.legalName} />
          </label>
          <label className="field">
            <span className="field__label">
              CNPJ ou CPF <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={sent.text("taxId", entity?.taxId ?? "")}
              maxLength={32}
              name="taxId"
            />
            <FieldError message={errors.taxId} />
          </label>
          <label className="field">
            <span className="field__label">
              Site <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={sent.text("website", entity?.website ?? "")}
              maxLength={255}
              name="website"
              placeholder="exemplo.com.br"
            />
            <FieldError message={errors.website} />
          </label>
          <label className="field">
            <span className="field__label">
              E-mail <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={sent.text("email", entity?.email ?? "")}
              maxLength={254}
              name="email"
              type="email"
            />
            <FieldError message={errors.email} />
          </label>
          <label className="field">
            <span className="field__label">
              Telefone <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={sent.text("phone", entity?.phone ?? "")}
              maxLength={32}
              name="phone"
            />
            <FieldError message={errors.phone} />
          </label>
          <label className="field sm:col-span-2">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea
              defaultValue={sent.text("notes", entity?.notes ?? "")}
              maxLength={5000}
              name="notes"
            />
            <FieldError message={errors.notes} />
          </label>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {onCancel ? (
          <button className="modal-cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={editing ? "Salvar empresa/marca" : "Criar empresa/marca"} />
      </div>
    </form>
  );
}
