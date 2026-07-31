"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const deletionSchema = z.object({
  acknowledged: z.literal("on"),
  confirmation: z.literal("EXCLUIR MINHA CONTA"),
});

const recentAuthenticationWindowSeconds = 10 * 60;

async function requestLifecycleOperation(requestType: "export" | "deletion"): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "Sua sessão expirou. Entre novamente." };
  }

  if (requestType === "deletion") {
    const issuedAt = claimsData.claims.iat;
    const authenticationAge =
      typeof issuedAt === "number"
        ? Math.floor(Date.now() / 1000) - issuedAt
        : Number.POSITIVE_INFINITY;

    if (authenticationAge < -30 || authenticationAge > recentAuthenticationWindowSeconds) {
      return {
        status: "error",
        message: "Por segurança, saia e entre novamente antes de solicitar a exclusão.",
      };
    }
  }

  const { data, error } = await supabase.rpc("request_current_account_lifecycle", {
    p_request_type: requestType,
  });
  const request = data?.[0];

  if (error || !request) {
    return { status: "error", message: "Não foi possível registrar a solicitação." };
  }

  revalidatePath("/perfil");
  return {
    status: "success",
    message: request.request_created
      ? requestType === "export"
        ? "Solicitação de exportação registrada."
        : "Solicitação de exclusão registrada para análise."
      : "Já existe uma solicitação ativa desse tipo.",
  };
}

export async function requestDataExport(
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  return requestLifecycleOperation("export");
}

export async function requestAccountDeletion(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const confirmation = deletionSchema.safeParse({
    acknowledged: formData.get("acknowledged"),
    confirmation: formData.get("confirmation"),
  });

  if (!confirmation.success) {
    return {
      status: "error",
      message: "Confirme a ciência e digite exatamente EXCLUIR MINHA CONTA.",
    };
  }

  return requestLifecycleOperation("deletion");
}
