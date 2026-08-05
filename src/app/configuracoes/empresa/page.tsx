import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell } from "@/app/_components/account-shell";
import { SettingsTabs } from "@/app/_components/settings-tabs";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { WorkspaceForm } from "./workspace-form";
import { WorkspaceDangerZone } from "./workspace-danger-zone";

export const metadata: Metadata = { title: "Configurações da empresa" };

export default async function WorkspaceSettingsPage() {
  await requireAccountPage("active");
  const supabase = await createServerSupabaseClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name, currency, timezone")
    .single();

  if (workspaceError || !workspace) {
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
      title="Configurações da empresa"
    >
      <SettingsTabs />
      <section className="panel-card">
        <WorkspaceForm settings={settings} workspace={workspace} />
      </section>
      <WorkspaceDangerZone />
    </AccountShell>
  );
}
