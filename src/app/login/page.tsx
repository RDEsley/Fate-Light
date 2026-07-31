import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { MagicLinkForm } from "@/app/(auth)/_components/magic-link-form";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = {
  searchParams: Promise<{ next?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;

  return (
    <AuthShell
      description="Receba um link de uso único no seu e-mail. Sem senha para guardar ou reutilizar."
      eyebrow="Acesso seguro"
      title="Entre para cuidar do que importa."
    >
      <MagicLinkForm
        mode="login"
        nextPath={sanitizeNextPath(parameters.next)}
        status={parameters.status}
      />
    </AuthShell>
  );
}
