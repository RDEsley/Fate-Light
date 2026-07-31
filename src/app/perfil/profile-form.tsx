"use client";

import { useTheme } from "next-themes";
import { useActionState, useEffect } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { initialActionState } from "@/lib/forms/action-state";

import { updateProfile } from "./actions";

type ProfileFormProps = {
  email: string;
  profile: {
    full_name: string;
    locale: string;
    phone: string | null;
    theme: string;
    timezone: string;
  };
};

const fieldClassName =
  "border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base";

export function ProfileForm({ email, profile }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, initialActionState);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (state.status === "success" && state.theme) {
      setTheme(state.theme);
    }
  }, [setTheme, state]);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <p
          className="border-line bg-brand-soft text-brand-strong rounded-xl border px-4 py-3 text-sm"
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">
          E-mail confirmado
          <input
            className={`${fieldClassName} text-muted`}
            disabled
            readOnly
            type="email"
            value={email}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Nome completo
          <input
            autoComplete="name"
            className={fieldClassName}
            defaultValue={profile.full_name}
            maxLength={120}
            name="fullName"
            required
          />
        </label>
        <label className="text-sm font-semibold">
          Telefone opcional
          <input
            autoComplete="tel"
            className={fieldClassName}
            defaultValue={profile.phone ?? ""}
            maxLength={32}
            name="phone"
            type="tel"
          />
        </label>
        <label className="text-sm font-semibold">
          Idioma
          <select className={fieldClassName} defaultValue={profile.locale} name="locale">
            <option value="pt-BR">Português (Brasil)</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Timezone pessoal
          <select className={fieldClassName} defaultValue={profile.timezone} name="timezone">
            <option value="America/Sao_Paulo">São Paulo</option>
            <option value="America/Recife">Recife</option>
            <option value="America/Manaus">Manaus</option>
            <option value="America/Rio_Branco">Rio Branco</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Tema
          <select className={fieldClassName} defaultValue={profile.theme} name="theme">
            <option value="system">Preferência do sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton idleLabel="Salvar perfil" />
      </div>
    </form>
  );
}
