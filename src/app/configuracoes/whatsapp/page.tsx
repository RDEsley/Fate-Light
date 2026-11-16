import type { Metadata } from "next";

import { AccountShell } from "@/app/_components/account-shell";
import { SettingsTabs } from "@/app/_components/settings-tabs";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { DeliveryList } from "./delivery-list";
import { WhatsAppSettingsForm } from "./whatsapp-settings-form";

export const metadata: Metadata = { title: "Lembretes pelo WhatsApp" };

export default async function WhatsAppSettingsPage() {
  const { guest, supabase, workspaceId, workspaceTimezone } = await requireWorkspaceContext();

  const [{ data: settings }, { data: hasToken }, { data: deliveries }] = await Promise.all([
    supabase
      .from("whatsapp_reminder_settings")
      .select(
        "enabled, phone_number_id, template_language, template_before, template_due, template_overdue, days_before, days_after, header_image_url, pix_key",
      )
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    // No modo visitante o RPC é recusado; sem token salvo é a leitura correta.
    supabase.rpc("has_whatsapp_access_token"),
    supabase
      .from("whatsapp_reminder_deliveries")
      .select(
        "id, kind, status, due_date, recipient_phone, contact_name, error_message, sent_at, status_at, created_at, clients(name)",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <AccountShell
      description="Cobranças pendentes avisadas no WhatsApp do cliente, no dia certo e com o nome dele."
      title="Lembretes pelo WhatsApp"
    >
      <div className="settings-layout">
        <aside className="settings-layout__nav">
          <SettingsTabs />
        </aside>

        <div className="settings-layout__content">
          <WhatsAppSettingsForm
            hasToken={hasToken === true}
            readOnly={guest}
            settings={settings ?? null}
          />
          <DeliveryList
            deliveries={(deliveries ?? []).map((delivery) => ({
              clientName: delivery.clients?.name ?? delivery.contact_name,
              contactName: delivery.contact_name,
              createdAt: delivery.created_at,
              dueDate: delivery.due_date,
              error: delivery.error_message,
              id: delivery.id,
              kind: delivery.kind,
              phone: delivery.recipient_phone,
              status: delivery.status,
              statusAt: delivery.status_at,
            }))}
            timeZone={workspaceTimezone}
          />
        </div>
      </div>
    </AccountShell>
  );
}
