import Link from "next/link";
import type { Route } from "next";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { publicEnvironment } from "@/config/env/public";

import { authenticateWithPassword } from "../actions";
import { TurnstileField } from "./turnstile-field";

const messages: Record<string, string> = {
  captcha: "Conclua a verificação de segurança e tente novamente.",
  "confirmation-sent": "Confira seu e-mail para confirmar a conta antes de entrar.",
  error: "Não foi possível criar a conta. Revise os dados ou tente novamente.",
  invalid: "Revise o nome, o e-mail, a senha e a confirmação informados.",
  "invalid-credentials": "E-mail ou senha incorretos.",
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
  const magicLinkHref =
    `${isLogin ? "/login" : "/cadastro"}?method=magic-link&next=${encodeURIComponent(nextPath)}` as Route;

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
      <form action={authenticateWithPassword} className="space-y-4">
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
          <label className="block text-sm font-semibold">
            Nome ou nome da empresa
            <input
              autoComplete="name"
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base"
              maxLength={120}
              minLength={2}
              name="displayName"
              placeholder="Como devemos chamar você?"
              required
              type="text"
            />
            <span className="text-muted mt-2 block text-xs">
              Usaremos esse nome para preparar seu primeiro acesso.
            </span>
          </label>
        ) : null}
        <label className="block text-sm font-semibold">
          E-mail
          <input
            autoComplete="email"
            className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base"
            maxLength={254}
            name="email"
            placeholder="voce@empresa.com.br"
            required
            type="email"
          />
        </label>
        <label className="block text-sm font-semibold">
          Senha
          <input
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base"
            minLength={8}
            maxLength={72}
            name="password"
            required
            type="password"
          />
          {!isLogin ? (
            <span className="text-muted mt-2 block text-xs">Use pelo menos 8 caracteres.</span>
          ) : null}
        </label>
        {!isLogin ? (
          <label className="block text-sm font-semibold">
            Confirmar senha
            <input
              autoComplete="new-password"
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base"
              minLength={8}
              maxLength={72}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
        ) : null}
        <TurnstileField siteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        <SubmitButton
          className="w-full"
          idleLabel={isLogin ? "Entrar" : "Criar conta"}
          pendingLabel={isLogin ? "Entrando…" : "Criando conta…"}
        />
      </form>
      {isLogin ? (
        <p className="text-muted mt-3 text-center text-sm">
          Sua conta ainda não tem senha? Use o magic link abaixo.
        </p>
      ) : null}
      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="border-line h-px flex-1 border-t" />
        <span className="text-muted text-xs uppercase">ou</span>
        <span className="border-line h-px flex-1 border-t" />
      </div>
      <Link
        className="cartoon-card hover:bg-brand-soft block min-h-11 px-5 py-3 text-center font-black"
        href={magicLinkHref}
      >
        {isLogin ? "Entrar com magic link" : "Criar conta com magic link"}
      </Link>
      <p className="text-muted mt-4 text-center text-sm leading-6">
        {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}{" "}
        <Link
          className="text-brand-strong font-semibold underline-offset-4 hover:underline"
          href={isLogin ? "/cadastro" : "/login"}
        >
          {isLogin ? "Cadastre-se" : "Entrar"}
        </Link>
      </p>
    </>
  );
}
