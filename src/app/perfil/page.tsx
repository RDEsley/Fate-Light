import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountShell } from "@/app/_components/account-shell";
import { SettingsTabs } from "@/app/_components/settings-tabs";
import { MotionSettings } from "@/components/motion-settings";
import { Icon } from "@/components/ui/icon";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { getInitials } from "@/lib/profile/initials";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { LifecycleRequestPanel } from "./lifecycle-request-panel";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Perfil" };

type ProfilePageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const userId = await requireAccountPage("active");
  const supabase = await createServerSupabaseClient();
  const [
    { data: claimsData },
    { data: profile, error },
    { data: lifecycleRequests, error: lifecycleError },
  ] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("profiles")
      .select("full_name, phone, locale, timezone")
      .eq("id", userId)
      .single(),
    supabase.rpc("get_current_account_lifecycle_requests"),
  ]);

  if (error || lifecycleError || !profile) {
    redirect("/auth/error");
  }

  const { status } = await searchParams;
  const email = typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : "";
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: profile.timezone,
  });
  const requests = lifecycleRequests.map((request) => ({
    requestId: request.request_id,
    requestedAt: request.requested_at,
    requestedAtLabel: dateFormatter.format(new Date(request.requested_at)),
    requestType: request.request_type === "deletion" ? ("deletion" as const) : ("export" as const),
    status: request.status,
  }));

  return (
    <AccountShell
      description="Atualize somente seus dados pessoais e preferências. A identidade de e-mail vem do provedor de autenticação."
      title="Perfil"
    >
      <SettingsTabs />
      {status === "workspace-created" ? (
        <p
          className="border-brand/25 bg-brand-soft text-brand-strong mb-6 rounded-xl border px-4 py-3 text-sm"
          role="status"
        >
          Workspace criado. Seus aceites e preferências foram registrados na mesma operação.
        </p>
      ) : null}

      <section className="profile-overview mb-4">
        <span className="profile-overview__avatar">{getInitials(profile.full_name)}</span>
        <span className="min-w-0">
          <strong className="block truncate text-lg">{profile.full_name}</strong>
          <span className="text-muted block truncate text-sm">{email}</span>
        </span>
        <span className="profile-overview__status">
          <Icon className="size-3.5" name="check" /> Conta ativa
        </span>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(19rem,.75fr)]">
        <section className="panel-card">
          <div className="section-heading mb-4">
            <span className="section-heading__icon bg-brand-soft text-brand-strong">
              <Icon name="user" />
            </span>
            <div>
              <h2>Dados do perfil</h2>
              <p>Identificação e localização usadas em todo o sistema.</p>
            </div>
          </div>
          <ProfileForm email={email} profile={profile} />
        </section>

        <aside className="space-y-4">
          <MotionSettings />
          <Link className="profile-company-link" href="/configuracoes/empresa">
            <span className="bg-warning-soft text-warning grid size-9 place-items-center rounded-lg">
              <Icon className="size-4" name="building" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">Configurações da empresa</strong>
              <span className="text-muted mt-0.5 block text-xs">Identidade, datas e alertas</span>
            </span>
            <span aria-hidden="true" className="text-muted">
              →
            </span>
          </Link>
        </aside>
      </div>

      <div className="mt-4">
        <LifecycleRequestPanel requests={requests} />
      </div>
    </AccountShell>
  );
}
