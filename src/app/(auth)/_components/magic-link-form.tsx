import Link from "next/link";

import { publicEnvironment } from "@/config/env/public";
import { SubmitButton } from "@/app/_components/submit-button";

import { requestMagicLink } from "../actions";
import { TurnstileField } from "./turnstile-field";

type MagicLinkFormProps = {
  mode: "login" | "signup";
  nextPath?: string;
  status?: string;
};

const statusMessages: Record<string, string> = {
  captcha: "Conclua a verificação de segurança e tente novamente.",
  invalid: "Informe um e-mail válido para continuar.",
  sent: "Se o e-mail estiver elegível, você receberá um link de acesso. Verifique também a caixa de spam.",
  "signed-out": "Sua sessão foi encerrada com segurança.",
};

export function MagicLinkForm({ mode, nextPath, status }: MagicLinkFormProps) {
  const isLogin = mode === "login";
  const message = status ? statusMessages[status] : undefined;

  return (
    <>
      {message ? (
        <p
          className="border-brand/25 bg-brand-soft text-brand-strong mb-5 rounded-xl border px-4 py-3 text-sm leading-6"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <form action={requestMagicLink} className="space-y-5">
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

        <div>
          <label className="text-sm font-semibold" htmlFor={`${mode}-email`}>
            E-mail
          </label>
          <input
            autoComplete="email"
            className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base"
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
          idleLabel={isLogin ? "Receber link de acesso" : "Criar minha conta"}
          pendingLabel="Enviando link…"
        />
      </form>

      <p className="text-muted mt-6 text-center text-sm leading-6">
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
