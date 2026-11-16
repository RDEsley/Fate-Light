"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

import { saveClientWhatsAppPreference } from "./whatsapp-actions";

export function WhatsAppPreferenceForm({
  clientId,
  defaultContactName,
  defaultEnabled,
  defaultPhone,
  placeholderName,
  readOnly,
  registeredPhone,
}: {
  clientId: string;
  defaultContactName: string;
  defaultEnabled: boolean;
  defaultPhone: string;
  placeholderName: string;
  readOnly: boolean;
  registeredPhone: string | null;
}) {
  const [state, formAction] = useActionState(saveClientWhatsAppPreference, initialActionState);
  const sent = submittedValues(state);

  return (
    <Form action={formAction} className="grid gap-3" state={state}>
      <input name="clientId" type="hidden" value={clientId} />
      <ToggleCard
        defaultChecked={sent.checkbox("enabled", defaultEnabled)}
        description="Envia no vencimento e, se configurado, antes e depois dele."
        name="enabled"
        title="Cobrar este cliente pelo WhatsApp"
      />
      <div className="form-grid sm:grid-cols-2">
        <TextField
          defaultValue={sent.text("contactName", defaultContactName)}
          hint="Como a mensagem chama o cliente. Vazio usa o primeiro nome do cadastro."
          label="Nome na mensagem"
          maxLength={80}
          name="contactName"
          optional
          placeholder={placeholderName.split(/\s+/)[0]}
        />
        <TextField
          defaultValue={sent.text("phone", defaultPhone)}
          hint={
            registeredPhone
              ? `Vazio usa o telefone do cadastro: ${registeredPhone}.`
              : "O cadastro não tem telefone: informe o WhatsApp com DDD."
          }
          inputMode="tel"
          label="WhatsApp para cobrança"
          maxLength={32}
          name="phone"
          optional
          type="tel"
        />
      </div>
      {readOnly ? null : (
        <FormActions>
          <SubmitButton idleLabel="Salvar WhatsApp" />
        </FormActions>
      )}
    </Form>
  );
}
