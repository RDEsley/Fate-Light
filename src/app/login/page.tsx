import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { MagicLinkForm } from "@/app/(auth)/_components/magic-link-form";
import { PasswordForm } from "@/app/(auth)/_components/password-form";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = {
  searchParams: Promise<{ method?: string; next?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const nextPath = sanitizeNextPath(parameters.next);
  const useMagicLink = parameters.method === "magic-link";

  return (
    <AuthShell
      description={
        useMagicLink
          ? "Receba um link de uso único no seu e-mail."
          : "Acesse com seu e-mail e senha ou escolha entrar por magic link."
      }
      eyebrow="Acesso seguro"
      title="Entre para cuidar do que importa."
    >
      {useMagicLink ? (
        <MagicLinkForm mode="login" nextPath={nextPath} status={parameters.status} />
      ) : (
        <PasswordForm mode="login" nextPath={nextPath} status={parameters.status} />
      )}
    </AuthShell>
  );
}
