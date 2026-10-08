import Link from "next/link";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { publicEnvironment } from "@/config/env/public";
import { guestNotice } from "@/lib/demo/guest";

import { authenticateWithPassword } from "../actions";
import { PasswordRevealField } from "./password-reveal-field";
import { TurnstileField } from "./turnstile-field";

const messages: Record<string, string> = {
  captcha: "Conclua a verificação de segurança e tente novamente.",
  "confirmation-sent": "Confira seu e-mail para confirmar a conta antes de entrar.",
  "email-rate-limit": "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.",
  error: "Não foi possível criar a conta. Revise os dados ou tente novamente.",
  guest: guestNotice,
  invalid: "Revise o nome, o e-mail, a senha e a confirmação informados.",
  "invalid-credentials":
    "E-mail ou senha incorretos. Se acabou de criar a conta, confirme o e-mail antes de entrar.",
  "password-updated": "Senha atualizada. Entre novamente com a nova senha.",
  "signed-out": "Sua sessão foi encerrada com segurança.",
};

export function PasswordForm({
  mode,
  nextPath,
  status,
}: {
  mode: "login" | "signup";
  nextPath: string;
  status?: string;
}) {
  const isLogin = mode === "login";
  const message = status ? messages[status] : undefined;

  return (
    <>
      {message ? (
        <FeedbackBanner
          message={message}
          tone={
            status === "invalid" ||
            status === "invalid-credentials" ||
            status === "error" ||
            status === "email-rate-limit" ||
            status === "captcha"
              ? "error"
              : status === "signed-out"
                ? "success"
                : "info"
          }
        />
      ) : null}
      <Form action={authenticateWithPassword} className="auth-shell__fields">
        <input name="mode" type="hidden" value={mode} />
        <input name="next" type="hidden" value={nextPath} />
        <div className="absolute -left-[10000px]" aria-hidden="true">
          <label htmlFor={`${mode}-password-website`}>Website</label>
          <input
            autoComplete="off"
            id={`${mode}-password-website`}
            name="website"
            tabIndex={-1}
            type="text"
          />
        </div>
        {!isLogin ? (
          <TextField
            autoComplete="name"
            label="Nome ou nome da empresa"
            maxLength={120}
            minLength={2}
            name="displayName"
            placeholder="Como devemos chamar você?"
            required
          />
        ) : null}
        <TextField
          autoComplete="email"
          label="E-mail"
          maxLength={254}
          name="email"
          placeholder="voce@empresa.com.br"
          required
          type="email"
        />
        {isLogin ? (
          <PasswordRevealField
            autoComplete="current-password"
            id={`${mode}-password`}
            label="Senha"
            labelAction={
              <Link
                className="text-brand-strong text-xs font-semibold hover:underline"
                href="/esqueci-senha"
              >
                Esqueci minha senha
              </Link>
            }
            name="password"
          />
        ) : (
          <>
            <PasswordRevealField
              autoComplete="new-password"
              hint="Mínimo de 8 caracteres."
              id={`${mode}-password`}
              label="Senha"
              name="password"
            />
            <PasswordRevealField
              autoComplete="new-password"
              id={`${mode}-password-confirm`}
              label="Confirmar senha"
              name="confirmPassword"
            />
          </>
        )}
        <TurnstileField siteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        <SubmitButton
          className="auth-shell__submit w-full"
          idleLabel={isLogin ? "Entrar" : "Criar conta"}
          pendingLabel={isLogin ? "Entrando…" : "Criando conta…"}
        />
      </Form>
      <p className="auth-shell__switch text-muted text-center text-sm leading-6">
        {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}{" "}
        <Link
          className="text-brand-strong font-semibold underline-offset-4 hover:underline"
          href={isLogin ? "/cadastro" : "/login"}
        >
          {isLogin ? "Criar conta" : "Entrar"}
        </Link>
      </p>
    </>
  );
}
