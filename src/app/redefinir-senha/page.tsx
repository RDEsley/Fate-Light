import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { updateRecoveredPassword } from "@/app/(auth)/actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <AuthShell
      description="Use pelo menos 8 caracteres e evite reutilizar senhas de outros serviços."
      eyebrow="Nova senha"
      title="Escolha uma senha segura."
    >
      {status ? (
        <FeedbackBanner
          message={
            status === "invalid"
              ? "As senhas devem ter pelo menos 8 caracteres e precisam ser iguais."
              : "Não foi possível atualizar a senha. Solicite um novo link."
          }
          tone="error"
        />
      ) : null}
      <form action={updateRecoveredPassword} className="space-y-4">
        <label className="field">
          <span className="field__label">Nova senha</span>
          <input
            autoComplete="new-password"
            maxLength={72}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <label className="field">
          <span className="field__label">Confirmar nova senha</span>
          <input
            autoComplete="new-password"
            maxLength={72}
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </label>
        <SubmitButton className="w-full" idleLabel="Atualizar senha" pendingLabel="Atualizando…" />
      </form>
    </AuthShell>
  );
}
