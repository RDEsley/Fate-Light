import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { PasswordForm } from "@/app/(auth)/_components/password-form";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = {
  searchParams: Promise<{ method?: string; next?: string; status?: string }>;
};

/**
 * Magic link permanece implementado (`MagicLinkForm` / `requestMagicLink`), mas fica fora da
 * UX pública até SMTP e templates serem validados em produção. `?method=magic-link` é ignorado.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const nextPath = sanitizeNextPath(parameters.next);

  return (
    <AuthShell eyebrow="Acesso" title="Bem-vindo de volta.">
      <PasswordForm mode="login" nextPath={nextPath} status={parameters.status} />
    </AuthShell>
  );
}
