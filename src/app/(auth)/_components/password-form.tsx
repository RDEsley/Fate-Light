import Link from "next/link";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { publicEnvironment } from "@/config/env/public";

import { authenticateWithPassword } from "../actions";
import { PasswordRevealField } from "./password-reveal-field";
import { TurnstileField } from "./turnstile-field";

const messages: Record<string, string> = {
  captcha: "Conclua a verificação de segurança e tente novamente.",
  "confirmation-sent": "Confira seu e-mail para confirmar a conta antes de entrar.",
  error: "Não foi possível criar a conta. Revise os dados ou tente novamente.",
  invalid: "Revise o nome, o e-mail, a senha e a confirmação informados.",
  "invalid-credentials": "E-mail ou senha incorretos.",
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
            status === "captcha"
              ? "error"
              : status === "signed-out"
                ? "success"
                : "info"
          }
        />
      ) : null}
      <form action={authenticateWithPassword} className="auth-shell__fields">
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
          <div className="field">
            <label className="field__label" htmlFor={`${mode}-password-display-name`}>
              Nome ou nome da empresa
            </label>
            <input
              autoComplete="name"
              className="text-base"
              id={`${mode}-password-display-name`}
              maxLength={120}
              minLength={2}
              name="displayName"
              placeholder="Como devemos chamar você?"
              required
              type="text"
            />
          </div>
        ) : null}
        <div className="field">
          <label className="field__label" htmlFor={`${mode}-password-email`}>
            E-mail
          </label>
          <input
            autoComplete="email"
            className="text-base"
            id={`${mode}-password-email`}
            maxLength={254}
            name="email"
            placeholder="voce@empresa.com.br"
            required
            type="email"
          />
        </div>
        {isLogin ? (
          <div className="field">
            <span className="flex items-center justify-between gap-3">
              <label className="field__label" htmlFor={`${mode}-password`}>
                Senha
              </label>
              <Link
                className="text-brand-strong text-xs font-semibold hover:underline"
                href="/esqueci-senha"
              >
                Esqueci minha senha
              </Link>
            </span>
            <input
              autoComplete="current-password"
              className="text-base"
              id={`${mode}-password`}
              maxLength={72}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
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
      </form>
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
