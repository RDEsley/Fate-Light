import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell } from "@/app/_components/account-shell";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { WorkspaceForm } from "./workspace-form";

export const metadata: Metadata = { title: "Configurações da empresa" };

export default async function WorkspaceSettingsPage() {
  const userId = await requireAccountPage("active");
  const supabase = await createServerSupabaseClient();
  const [{ data: profile }, { data: workspace, error: workspaceError }] = await Promise.all([
    supabase.from("profiles").select("full_name, theme").eq("id", userId).single(),
    supabase.from("workspaces").select("id, name, currency, timezone").single(),
  ]);

  if (!profile || workspaceError || !workspace) {
    redirect("/auth/error");
  }

  const { data: settings, error: settingsError } = await supabase
    .from("workspace_settings")
    .select(
      "legal_name, trade_name, tax_id, address_line1, address_line2, address_district, address_city, address_region, postal_code, country_code, date_format, accounting_basis, default_alert_offsets",
    )
    .eq("workspace_id", workspace.id)
    .single();

  if (settingsError || !settings) {
    redirect("/auth/error");
  }

  return (
    <AccountShell
      description="Mantenha identidade, endereço e preferências gerenciais do workspace em uma atualização atômica."
      fullName={profile.full_name}
      theme={profile.theme}
      title="Configurações da empresa"
    >
      <section className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8">
        <WorkspaceForm settings={settings} workspace={workspace} />
      </section>
    </AccountShell>
  );
}
