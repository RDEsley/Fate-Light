"use server";

import { revalidatePath } from "next/cache";

import {
  parseWhatsAppSettingsForm,
  whatsappSettingsFieldMessages,
} from "@/features/whatsapp/schemas";
import { rejectSubmission, type ActionState } from "@/lib/forms/action-state";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const guestMessage = "No modo visitante as configurações são somente leitura.";

export async function updateWhatsAppSettings(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseWhatsAppSettingsForm(formData);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      parsed.error.issues.map((issue) => {
        const field = String(issue.path[0] ?? "");
        return [field, whatsappSettingsFieldMessages[field] ?? "Revise este campo."];
      }),
    );
    return rejectSubmission(formData, "Revise a configuração do WhatsApp.", fieldErrors);
  }

  const context = await requireWorkspaceContext();
  if (context.guest) return rejectSubmission(formData, guestMessage);
  const { supabase, workspaceId } = context;
  const input = parsed.data;

  if (input.removeToken || input.accessToken) {
    const { error } = await supabase.rpc("set_whatsapp_access_token", {
      p_token: input.removeToken ? "" : input.accessToken,
    });
    if (error) return rejectSubmission(formData, "Não foi possível salvar o token da Meta.");
  }

  if (input.enabled) {
    const { data: hasToken } = await supabase.rpc("has_whatsapp_access_token");
    const missing: Record<string, string> = {};
    if (!input.phoneNumberId) missing.phoneNumberId = "Obrigatório para ligar os lembretes.";
    if (!input.templateDue) missing.templateDue = "Obrigatório para ligar os lembretes.";
    if (!hasToken) missing.accessToken = "Salve o token da Meta para ligar os lembretes.";
    if (Object.keys(missing).length > 0) {
      return rejectSubmission(
        formData,
        "Para ligar os lembretes, preencha número, template e token.",
        missing,
      );
    }
  }

  // Template de antes/depois só vale com dias configurados, e vice-versa.
  const values = {
    days_after: input.templateOverdue ? input.daysAfter : 0,
    days_before: input.templateBefore ? input.daysBefore : 0,
    enabled: input.enabled,
    header_image_url: input.headerImageUrl,
    phone_number_id: input.phoneNumberId,
    pix_key: input.pixKey,
    template_before: input.daysBefore > 0 ? input.templateBefore : null,
    template_due: input.templateDue,
    template_language: input.templateLanguage,
    template_overdue: input.daysAfter > 0 ? input.templateOverdue : null,
  };

  const { data: existing } = await supabase
    .from("whatsapp_reminder_settings")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  // Sem upsert: o grant de update não inclui `workspace_id`, que nunca muda.
  const { error } = existing
    ? await supabase
        .from("whatsapp_reminder_settings")
        .update(values)
        .eq("workspace_id", workspaceId)
    : await supabase
        .from("whatsapp_reminder_settings")
        .insert({ ...values, workspace_id: workspaceId });

  if (error) return rejectSubmission(formData, "Não foi possível salvar a configuração.");

  revalidatePath("/configuracoes/whatsapp");
  return {
    message: input.enabled ? "Lembretes pelo WhatsApp ligados." : "Configuração salva.",
    status: "success",
  };
}
