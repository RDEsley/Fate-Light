"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
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
