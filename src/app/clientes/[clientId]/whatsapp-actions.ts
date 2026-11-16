"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseClientWhatsAppForm } from "@/features/whatsapp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { rejectSubmission, type ActionState } from "@/lib/forms/action-state";

const fieldMessages: Record<string, string> = {
  contactName: "Use de 2 a 80 caracteres.",
  phone: "Informe o WhatsApp com DDD, por exemplo (61) 99999-1234.",
};

export async function saveClientWhatsAppPreference(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clientId = z.string().uuid().safeParse(formData.get("clientId"));
  if (!clientId.success) return rejectSubmission(formData, "Cliente inválido.");

  const parsed = parseClientWhatsAppForm(formData);
  if (!parsed.success) {
    return rejectSubmission(formData, "Revise os dados do WhatsApp.", {
      [parsed.field]: fieldMessages[parsed.field] ?? "Revise este campo.",
    });
  }

  const context = await requireWorkspaceContext();
  if (context.guest) {
    return rejectSubmission(formData, "No modo visitante os dados são somente leitura.");
  }
  const { supabase, workspaceId } = context;

  const { data: client } = await supabase
    .from("clients")
    .select("phone")
    .eq("id", clientId.data)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!client) return rejectSubmission(formData, "Cliente não encontrado.");

  if (parsed.data.enabled && !parsed.data.phone && !client.phone) {
    return rejectSubmission(formData, "Informe um WhatsApp para ativar os lembretes.", {
      phone: "Sem telefone no cadastro, informe o WhatsApp aqui.",
    });
  }

  const values = {
    contact_name: parsed.data.contactName,
    enabled: parsed.data.enabled,
    phone: parsed.data.phone,
  };
  const { data: existing } = await supabase
    .from("client_whatsapp_preferences")
    .select("client_id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", clientId.data)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("client_whatsapp_preferences")
        .update(values)
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId.data)
    : await supabase
        .from("client_whatsapp_preferences")
        .insert({ ...values, client_id: clientId.data, workspace_id: workspaceId });

  if (error) return rejectSubmission(formData, "Não foi possível salvar o WhatsApp do cliente.");

  revalidatePath(`/clientes/${clientId.data}`);
  return {
    message: parsed.data.enabled
      ? "Lembretes pelo WhatsApp ativados para este cliente."
      : "Lembretes pelo WhatsApp desativados para este cliente.",
    status: "success",
  };
}
