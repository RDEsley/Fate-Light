import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell } from "@/app/_components/account-shell";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Perfil" };

type ProfilePageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const userId = await requireAccountPage("active");
  const supabase = await createServerSupabaseClient();
  const [{ data: claimsData }, { data: profile, error }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("profiles")
      .select("full_name, phone, locale, timezone, theme")
      .eq("id", userId)
      .single(),
  ]);

  if (error || !profile) {
    redirect("/auth/error");
  }

  const { status } = await searchParams;
  const email = typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : "";

  return (
    <AccountShell
      description="Atualize somente seus dados pessoais e preferências. A identidade de e-mail vem do provedor de autenticação."
      fullName={profile.full_name}
      theme={profile.theme}
      title="Perfil"
    >
      {status === "workspace-created" ? (
        <p
          className="border-brand/25 bg-brand-soft text-brand-strong mb-6 rounded-xl border px-4 py-3 text-sm"
          role="status"
        >
          Workspace criado. Seus aceites e preferências foram registrados na mesma operação.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Dados pessoais</h2>
          <p className="text-muted mt-2 mb-6 text-sm leading-6">
            Avatar permanece desabilitado; suas iniciais identificam a conta sem upload de imagem.
          </p>
          <ProfileForm email={email} profile={profile} />
        </section>

        <aside className="space-y-4">
          <section className="border-line bg-surface rounded-2xl border p-5">
            <h2 className="font-semibold">Sessão atual</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              A sessão usa cookies SSR e pode ser encerrada pelo botão “Sair”.
            </p>
          </section>
          <section className="border-line bg-surface rounded-2xl border p-5">
            <h2 className="font-semibold">Seus dados</h2>
            <p className="text-muted mt-2 text-sm leading-6">
              Exportação e solicitação de exclusão serão estruturadas na etapa de hardening, sem
              exclusão irreversível automática.
            </p>
          </section>
        </aside>
      </div>
    </AccountShell>
  );
}
