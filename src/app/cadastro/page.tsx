import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { PasswordForm } from "@/app/(auth)/_components/password-form";

export const metadata: Metadata = { title: "Cadastro" };

type SignUpPageProps = {
  searchParams: Promise<{ method?: string; status?: string }>;
};

/**
 * Magic link de cadastro permanece no código para reativação futura; a UI pública usa só senha.
 * `?method=magic-link` é ignorado de propósito enquanto SMTP não estiver validado.
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { status } = await searchParams;

  return (
    <AuthShell
      description="Crie uma senha segura. Depois, revise os termos e configure seu workspace."
      eyebrow="Nova conta"
      title="Organize a operação desde a origem."
    >
      <PasswordForm mode="signup" nextPath="/onboarding" status={status} />
    </AuthShell>
  );
}
