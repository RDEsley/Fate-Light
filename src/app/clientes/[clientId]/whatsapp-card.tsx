import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/features/whatsapp/phone";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { WhatsAppPreferenceForm } from "./whatsapp-preference-form";

/** Bloco da ficha que liga os lembretes de cobrança deste cliente (ADR-0024). */
export async function ClientWhatsAppCard({
  clientId,
  clientName,
  clientPhone,
}: {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
}) {
  const { guest, supabase, workspaceId } = await requireWorkspaceContext();
  const [{ data: preference }, { data: settings }] = await Promise.all([
    supabase
      .from("client_whatsapp_preferences")
      .select("enabled, phone, contact_name")
      .eq("workspace_id", workspaceId)
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("whatsapp_reminder_settings")
      .select("enabled")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  const registeredPhone = normalizeWhatsAppPhone(clientPhone);

  return (
    <section className="panel-card mt-4" id="whatsapp">
      <div className="section-heading mb-4">
        <span className="section-heading__icon bg-positive-soft text-positive">
          <Icon name="phone" />
        </span>
        <div>
          <h2>Lembretes pelo WhatsApp</h2>
          <p>
            {settings?.enabled
              ? "Cobranças pendentes deste cliente são avisadas automaticamente no WhatsApp."
              : "A automação está desligada para a empresa. Ative em Configurações > WhatsApp."}
          </p>
        </div>
      </div>
      {settings?.enabled ? null : (
        <p className="mb-4">
          <Link className="button button--secondary button--small" href="/configuracoes/whatsapp">
            Configurar lembretes
          </Link>
        </p>
      )}
      <WhatsAppPreferenceForm
        clientId={clientId}
        defaultContactName={preference?.contact_name ?? ""}
        defaultEnabled={preference?.enabled ?? false}
        defaultPhone={preference?.phone ?? ""}
        placeholderName={clientName}
        readOnly={guest}
        registeredPhone={registeredPhone ? formatWhatsAppPhone(registeredPhone) : null}
      />
    </section>
  );
}
