"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FormMore } from "@/components/ui/form-panel";
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
  returnTo,
}: {
  clientId: string;
  entity?: ClientEntityValues;
  onCancel?: () => void;
  /** `edit` devolve o usuário à edição do cliente, onde este cadastro vive. */
  returnTo?: "edit";
}) {
  const editing = Boolean(entity);
  const [state, formAction] = useActionState(
    editing ? updateClientEntity : createClientEntity,
    initialActionState,
  );
  const sent = submittedValues(state);

  return (
    <Form action={formAction} className="grid gap-4" state={state}>
      <input name="clientId" type="hidden" value={clientId} />
      {entity ? <input name="entityId" type="hidden" value={entity.id} /> : null}
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}

      <div className="form-grid sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          className="lg:col-span-2"
          defaultValue={sent.text("displayName", entity?.displayName ?? "")}
          hint="É este nome que aparece nos serviços, cobranças, despesas e domínios ligados a ela."
          label="Nome da empresa ou marca"
          maxLength={160}
          minLength={2}
          name="displayName"
          placeholder="Ex.: Padaria do Bairro"
          required
        />
        <SelectField
          defaultValue={sent.text("entityType", entity?.entityType ?? "company")}
          label="Tipo"
          name="entityType"
          options={clientEntityTypeOptions}
        />
      </div>

      <FormMore
        description="Razão social, documento, site, e-mail e telefone"
        icon="file"
        title="Dados fiscais e de contato"
      >
        <div className="form-grid sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            className="sm:col-span-2"
            defaultValue={sent.text("legalName", entity?.legalName ?? "")}
            label="Razão social"
            maxLength={200}
            name="legalName"
            optional
          />
          <TextField
            defaultValue={sent.text("taxId", entity?.taxId ?? "")}
            label="CNPJ ou CPF"
            maxLength={32}
            name="taxId"
            optional
          />
          <TextField
            defaultValue={sent.text("website", entity?.website ?? "")}
            label="Site"
            maxLength={255}
            name="website"
            optional
            placeholder="exemplo.com.br"
          />
          <TextField
            defaultValue={sent.text("email", entity?.email ?? "")}
            label="E-mail"
            maxLength={254}
            name="email"
            optional
            type="email"
          />
          <TextField
            defaultValue={sent.text("phone", entity?.phone ?? "")}
            label="Telefone"
            maxLength={32}
            name="phone"
            optional
            type="tel"
          />
          <TextField
            className="sm:col-span-2 lg:col-span-3"
            defaultValue={sent.text("notes", entity?.notes ?? "")}
            label="Observações"
            maxLength={5000}
            multiline
            name="notes"
            optional
          />
        </div>
      </FormMore>

      <FormActions>
        {onCancel ? (
          <button className="button button--secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={editing ? "Salvar empresa/marca" : "Criar empresa/marca"} />
      </FormActions>
    </Form>
  );
}
