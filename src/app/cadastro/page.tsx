import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { MagicLinkForm } from "@/app/(auth)/_components/magic-link-form";
import { PasswordForm } from "@/app/(auth)/_components/password-form";

export const metadata: Metadata = { title: "Cadastro" };

type SignUpPageProps = {
  searchParams: Promise<{ method?: string; status?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { method, status } = await searchParams;
  const useMagicLink = method === "magic-link";

  return (
    <AuthShell
      description={
        useMagicLink
          ? "Crie a conta com um link de uso único enviado ao seu e-mail."
          : "Crie uma senha segura. Depois, revise os termos e configure seu workspace."
      }
      eyebrow="Nova conta"
      title="Organize a operação desde a origem."
    >
      {useMagicLink ? (
        <MagicLinkForm mode="signup" nextPath="/onboarding" status={status} />
      ) : (
        <PasswordForm mode="signup" nextPath="/onboarding" status={status} />
      )}
    </AuthShell>
  );
}
