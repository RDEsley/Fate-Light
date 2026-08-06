import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountShell } from "@/app/_components/account-shell";
import { SettingsTabs } from "@/app/_components/settings-tabs";
import { Icon } from "@/components/ui/icon";
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
      <div className="settings-layout">
        <aside className="settings-layout__nav">
          <SettingsTabs />
          <Link className="profile-company-link" href="/perfil">
            <span className="bg-brand-soft text-brand-strong grid size-9 place-items-center rounded-lg">
              <Icon className="size-4" name="user" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">Ir para o perfil</strong>
              <span className="text-muted mt-0.5 block text-xs">
                Identidade, contato e privacidade
              </span>
            </span>
            <span aria-hidden="true" className="text-muted">
              →
            </span>
          </Link>
        </aside>

        <div className="settings-layout__content">
          <section className="panel-card">
            <WorkspaceForm settings={settings} workspace={workspace} />
          </section>
          <WorkspaceDangerZone />
        </div>
      </div>
    </AccountShell>
  );
}
