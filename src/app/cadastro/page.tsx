import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { MagicLinkForm } from "@/app/(auth)/_components/magic-link-form";

export const metadata: Metadata = { title: "Cadastro" };

type SignUpPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { status } = await searchParams;

  return (
    <AuthShell
      description="Comece com seu e-mail profissional. Depois da confirmação, você revisará os termos e configurará seu workspace."
      eyebrow="Nova conta"
      title="Organize a operação desde a origem."
    >
      <MagicLinkForm mode="signup" nextPath="/onboarding" status={status} />
    </AuthShell>
  );
}
