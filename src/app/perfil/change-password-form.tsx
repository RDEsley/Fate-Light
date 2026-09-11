"use client";

import { useActionState } from "react";

import { PasswordRevealField } from "@/app/(auth)/_components/password-reveal-field";
import { TurnstileField } from "@/app/(auth)/_components/turnstile-field";
import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Icon } from "@/components/ui/icon";
import { publicEnvironment } from "@/config/env/public";
import { initialActionState } from "@/lib/forms/action-state";

import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialActionState);

  return (
    <section className="panel-card" id="seguranca">
      <div className="section-heading mb-4">
        <span className="section-heading__icon bg-brand-soft text-brand-strong">
          <Icon name="check" />
        </span>
        <div>
          <h2>Alterar senha</h2>
          <p>Confirme a senha atual e defina uma nova com pelo menos 8 caracteres.</p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        {state.message ? (
          <FeedbackBanner
            message={state.message}
            tone={state.status === "error" ? "error" : "success"}
          />
        ) : null}

        <div className="change-password-fields">
          <PasswordRevealField
            autoComplete="current-password"
            id="perfil-current-password"
            label="Senha atual"
            name="currentPassword"
          />
          <PasswordRevealField
            autoComplete="new-password"
            hint="Use pelo menos 8 caracteres."
            id="perfil-new-password"
            label="Nova senha"
            name="password"
          />
          <PasswordRevealField
            autoComplete="new-password"
            id="perfil-confirm-password"
            label="Confirmar nova senha"
            name="confirmPassword"
          />
        </div>

        <div className="change-password-turnstile">
          <TurnstileField siteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </div>

        <div className="change-password-actions">
          <SubmitButton idleLabel="Atualizar senha" pendingLabel="Atualizando…" />
        </div>
      </form>
    </section>
  );
}
