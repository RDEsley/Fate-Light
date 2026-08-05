"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
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

const fieldClassName = "w-full";

export function ProfileForm({ email, profile }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <FeedbackBanner
          message={state.message}
          tone={state.status === "error" ? "error" : "success"}
        />
      ) : null}

      <div className="profile-form-grid">
        <label className="field">
          <span className="field__label">Nome completo</span>
          <input
            autoComplete="name"
            className={fieldClassName}
            defaultValue={profile.full_name}
            maxLength={120}
            name="fullName"
            required
          />
        </label>
        <label className="field">
          <span className="field__label">E-mail confirmado</span>
          <input
            className={`${fieldClassName} text-muted`}
            disabled
            readOnly
            type="email"
            value={email}
          />
        </label>
        <label className="field">
          <span className="field__label">
            Telefone <span className="field__optional">opcional</span>
          </span>
          <input
            autoComplete="tel"
            className={fieldClassName}
            defaultValue={profile.phone ?? ""}
            maxLength={32}
            name="phone"
            type="tel"
          />
        </label>
        <label className="field">
          <span className="field__label">Fuso horário</span>
          <select className={fieldClassName} defaultValue={profile.timezone} name="timezone">
            <option value="America/Sao_Paulo">São Paulo</option>
            <option value="America/Recife">Recife</option>
            <option value="America/Manaus">Manaus</option>
            <option value="America/Rio_Branco">Rio Branco</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <input name="locale" type="hidden" value={profile.locale} />
      </div>

      <div className="flex justify-end border-t pt-4">
        <SubmitButton idleLabel="Salvar perfil" />
      </div>
    </form>
  );
}
