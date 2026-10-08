"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { Field, FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState } from "@/lib/forms/action-state";

import { updateProfile } from "./actions";

type ProfileFormProps = {
  email: string;
  profile: {
    full_name: string;
    locale: string;
    phone: string | null;
    timezone: string;
  };
};

export function ProfileForm({ email, profile }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, initialActionState);

  return (
    <Form action={formAction} className="grid gap-4" state={state}>
      <div className="form-grid sm:grid-cols-2">
        <TextField
          autoComplete="name"
          defaultValue={profile.full_name}
          label="Nome completo"
          maxLength={120}
          minLength={2}
          name="fullName"
          required
        />
        <Field htmlFor="profile-email" label="E-mail confirmado">
          <input
            className="text-muted"
            disabled
            id="profile-email"
            readOnly
            type="email"
            value={email}
          />
        </Field>
        <TextField
          autoComplete="tel"
          defaultValue={profile.phone ?? ""}
          label="Telefone"
          maxLength={32}
          minLength={7}
          name="phone"
          optional
          type="tel"
        />
        <SelectField
          defaultValue={profile.timezone}
          hint="Usado nas suas preferências pessoais. Datas financeiras seguem o fuso da empresa."
          label="Fuso horário"
          name="timezone"
          options={[
            { label: "São Paulo", value: "America/Sao_Paulo" },
            { label: "Recife", value: "America/Recife" },
            { label: "Manaus", value: "America/Manaus" },
            { label: "Rio Branco", value: "America/Rio_Branco" },
            { label: "UTC", value: "UTC" },
          ]}
        />
        <input name="locale" type="hidden" value={profile.locale} />
      </div>

      <FormActions>
        <SubmitButton idleLabel="Salvar perfil" />
      </FormActions>
    </Form>
  );
}
