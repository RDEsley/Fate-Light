import Link from "next/link";
import type { Route } from "next";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { publicEnvironment } from "@/config/env/public";

import { requestMagicLink } from "../actions";
import { TurnstileField } from "./turnstile-field";

type MagicLinkFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
  status?: string;
};

const statusMessages: Record<string, string> = {
  captcha: "Conclua a verificação de segurança e tente novamente.",
  "email-rate-limit":
    "Muitas solicitações de e-mail foram feitas. Aguarde alguns minutos antes de tentar novamente.",
  invalid: "Revise o nome ou nome da empresa e informe um e-mail válido.",
  sent: "Se o e-mail estiver elegível, você receberá um link de acesso. Verifique também a caixa de spam.",
  "signed-out": "Sua sessão foi encerrada com segurança.",
};

export function MagicLinkForm({ mode, nextPath, status }: MagicLinkFormProps) {
  const isLogin = mode === "login";
  const message = status ? statusMessages[status] : undefined;
  const passwordHref =
    `${isLogin ? "/login" : "/cadastro"}?next=${encodeURIComponent(nextPath ?? (isLogin ? "/dashboard" : "/onboarding"))}` as Route;

  return (
    <>
      {message ? (
        <FeedbackBanner
          message={message}
          tone={
            status === "invalid" || status === "captcha" || status === "email-rate-limit"
              ? "error"
              : status === "signed-out"
                ? "success"
                : "info"
          }
        />
      ) : null}

      <form action={requestMagicLink} className="space-y-4">
        <input name="mode" type="hidden" value={mode} />
        <input name="next" type="hidden" value={nextPath ?? ""} />
        <div className="absolute -left-[10000px]" aria-hidden="true">
          <label htmlFor={`${mode}-website`}>Website</label>
          <input
            autoComplete="off"
            id={`${mode}-website`}
            name="website"
            tabIndex={-1}
            type="text"
          />
        </div>

        {!isLogin ? (
          <div className="field">
            <label className="field__label" htmlFor={`${mode}-display-name`}>
              Nome ou nome da empresa
            </label>
            <input
              autoComplete="name"
              className="text-base"
              id={`${mode}-display-name`}
              maxLength={120}
              minLength={2}
              name="displayName"
              placeholder="Como devemos chamar você?"
              required
              type="text"
            />
            <span className="field__hint">
              Usaremos esse nome para preparar seu primeiro acesso.
            </span>
          </div>
        ) : null}

        <div className="field">
          <label className="field__label" htmlFor={`${mode}-email`}>
            E-mail
          </label>
          <input
            autoComplete="email"
            className="text-base"
            id={`${mode}-email`}
            inputMode="email"
            maxLength={254}
            name="email"
            placeholder="voce@empresa.com.br"
            required
            type="email"
          />
        </div>

        <TurnstileField siteKey={publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        <SubmitButton
          className="w-full"
          idleLabel={isLogin ? "Receber link de acesso" : "Criar minha conta"}
          pendingLabel="Enviando link…"
        />
      </form>

      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className="border-line h-px flex-1 border-t" />
        <span className="text-muted text-xs uppercase">ou</span>
        <span className="border-line h-px flex-1 border-t" />
      </div>
      <Link
        className="cartoon-card hover:bg-brand-soft block min-h-11 px-5 py-3 text-center font-black"
        href={passwordHref}
      >
        {isLogin ? "Entrar com e-mail e senha" : "Criar conta com e-mail e senha"}
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
