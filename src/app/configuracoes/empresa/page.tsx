import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountShell } from "@/app/_components/account-shell";
import { SettingsTabs } from "@/app/_components/settings-tabs";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { WorkspaceForm } from "./workspace-form";
import { WorkspaceDangerZone } from "./workspace-danger-zone";

export const metadata: Metadata = { title: "Configurações da empresa" };

export default async function WorkspaceSettingsPage() {
  const { supabase } = await requireWorkspaceContext();
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
      description="Identidade, endereço e preferências financeiras do seu workspace."
      title="Configurações da empresa"
    >
      <div className="settings-layout">
        <aside className="settings-layout__nav">
          <SettingsTabs />
        </aside>

        <div className="settings-layout__content">
          <WorkspaceForm settings={settings} workspace={workspace} />
          <WorkspaceDangerZone />
        </div>
      </div>
    </AccountShell>
  );
}
