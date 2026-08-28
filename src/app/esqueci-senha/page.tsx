import Link from "next/link";
import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { TurnstileField } from "@/app/(auth)/_components/turnstile-field";
import { requestPasswordRecovery } from "@/app/(auth)/actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { publicEnvironment } from "@/config/env/public";

export const metadata: Metadata = { title: "Recuperar senha" };

const messages: Record<string, string> = {
  captcha: "Conclua a verificação de segurança e tente novamente.",
  "email-rate-limit": "Muitas solicitações foram feitas. Aguarde alguns minutos e tente novamente.",
  invalid: "Informe um e-mail válido.",
  sent: "Se o e-mail estiver cadastrado, enviaremos um link seguro. Verifique também a caixa de spam.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <AuthShell
      description="Enviaremos um link temporário para você criar uma nova senha."
      eyebrow="Recuperação segura"
      title="Volte para sua rotina."
    >
      {status && messages[status] ? (
        <FeedbackBanner message={messages[status]} tone={status === "sent" ? "success" : "error"} />
      ) : null}
      <form action={requestPasswordRecovery} className="space-y-4">
        <div className="absolute -left-[10000px]" aria-hidden="true">
          <label htmlFor="recovery-website">Website</label>
          <input autoComplete="off" id="recovery-website" name="website" tabIndex={-1} />
        </div>
        <label className="field">
          <span className="field__label">E-mail</span>
          <input
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>
        <TurnstileField siteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        <SubmitButton
          className="w-full"
          idleLabel="Enviar link de recuperação"
          pendingLabel="Enviando…"
        />
      </form>
      <Link
        className="text-brand-strong mt-5 block text-center text-sm font-bold hover:underline"
        href="/login"
      >
        Voltar para o login
      </Link>
    </AuthShell>
  );
}
