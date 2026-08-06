"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  locale: z.literal("pt-BR"),
  phone: z.string().trim().min(7).max(32).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(64),
});

export async function updateProfile(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    locale: formData.get("locale"),
    phone: formData.get("phone"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Revise os dados do perfil antes de salvar." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return { status: "error", message: "Sua sessão expirou. Entre novamente." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      locale: parsed.data.locale,
      phone: parsed.data.phone || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", userId)
    .select("id")
    .single();

  if (error || data.id !== userId) {
    return { status: "error", message: "Não foi possível atualizar o perfil." };
  }

  revalidatePath("/perfil");
  return {
    status: "success",
    message: "Perfil atualizado com segurança.",
  };
}

const alertOffsetsSchema = z
  .array(z.coerce.number().int().min(0).max(365))
  .min(1)
  .max(7)
  .transform((values) => [...new Set(values)].sort((left, right) => right - left));

/**
 * Antecedência dos alertas. Fica no perfil porque é preferência de quem usa o sistema,
 * não identidade da empresa — apesar de o valor ser guardado por workspace.
 */
export async function updateAlertPreferences(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = alertOffsetsSchema.safeParse(formData.getAll("alertOffsets"));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Escolha ao menos uma antecedência para continuar recebendo avisos.",
    };
  }

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("workspace_settings")
    .update({ default_alert_offsets: parsed.data })
    .eq("workspace_id", workspaceId)
    .select("workspace_id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Não foi possível salvar a antecedência dos alertas." };
  }

  revalidatePath("/perfil");
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Alertas configurados para avisar com ${parsed.data.join(", ")} dia(s) de antecedência.`,
  };
}
