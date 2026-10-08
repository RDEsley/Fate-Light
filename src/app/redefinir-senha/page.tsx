import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { PasswordRevealField } from "@/app/(auth)/_components/password-reveal-field";
import { updateRecoveredPassword } from "@/app/(auth)/actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Form } from "@/components/ui/form";

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
      <Form action={updateRecoveredPassword} className="auth-shell__fields">
        <PasswordRevealField
          autoComplete="new-password"
          id="reset-password"
          label="Nova senha"
          name="password"
        />
        <PasswordRevealField
          autoComplete="new-password"
          id="reset-password-confirm"
          label="Confirmar nova senha"
          name="confirmPassword"
        />
        <SubmitButton
          className="auth-shell__submit w-full"
          idleLabel="Atualizar senha"
          pendingLabel="Atualizando…"
        />
      </Form>
    </AuthShell>
  );
}
