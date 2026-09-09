"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  readTransferPayload,
  transferClientSchema,
  transferReasonMessages,
} from "@/features/clients/entity-schemas";
import { databaseErrorMessage } from "@/features/mvp/messages";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import type { TransferActionState } from "./transfer-state";

const identifierSchema = z.string().uuid();

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

function revalidateTransferSurfaces(sourceClientId: string, targetClientId: string) {
  revalidatePath(`/clientes/${sourceClientId}`);
  revalidatePath(`/clientes/${targetClientId}`);
  revalidatePath("/clientes");
  revalidatePath("/cobrancas");
  revalidatePath("/despesas");
  revalidatePath("/dominios");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
}

function transferError(reason: string, fallback?: string): TransferActionState {
  return {
    message: transferReasonMessages[reason] ?? fallback ?? "Não foi possível transferir.",
    status: "error",
  };
}

/**
 * Prévia da transferência. Nada é gravado: a RPC é `stable` e só conta o que seria movido.
 */
export async function previewTransferClientData(
  _state: TransferActionState,
  formData: FormData,
): Promise<TransferActionState> {
  const sourceClientId = identifierSchema.safeParse(formData.get("sourceClientId"));
  const targetClientId = identifierSchema.safeParse(formData.get("targetClientId"));
  if (!sourceClientId.success || !targetClientId.success) {
    return transferError("missing_ids");
  }

  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("preview_transfer_client_data", {
    p_source_client_id: sourceClientId.data,
    p_target_client_id: targetClientId.data,
  });
  if (error) return { message: databaseErrorMessage(error), status: "error" };

  const payload = readTransferPayload(data);
  if (!payload) return { message: "Não foi possível calcular a prévia.", status: "error" };
  if (!payload.ok) return transferError(payload.reason, payload.message);
  return { preview: payload, status: "preview", targetClientId: targetClientId.data };
}

/**
 * Executa a transferência. A RPC exige TRANSFERIR e recusa o trabalho se os totais
 * depois não baterem com os de antes.
 */
export async function transferClientData(
  _state: TransferActionState,
  formData: FormData,
): Promise<TransferActionState> {
  const values = transferClientSchema.safeParse({
    confirmation: String(formData.get("confirmation") ?? "").trim(),
    sourceClientId: formData.get("sourceClientId"),
    targetClientId: formData.get("targetClientId"),
  });
  if (!values.success) {
    const confirmationFailed = values.error.issues.some(
      (issue) => issue.path[0] === "confirmation",
    );
    return transferError(confirmationFailed ? "confirmation_required" : "missing_ids");
  }

  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("transfer_client_data", {
    p_confirmation: values.data.confirmation,
    p_source_client_id: values.data.sourceClientId,
    p_target_client_id: values.data.targetClientId,
  });
  if (error) return { message: databaseErrorMessage(error), status: "error" };

  const payload = readTransferPayload(data);
  if (!payload) return { message: "Não foi possível transferir.", status: "error" };
  if (!payload.ok) return transferError(payload.reason, payload.message);

  revalidateTransferSurfaces(values.data.sourceClientId, values.data.targetClientId);
  statusRedirect(`/clientes/${values.data.targetClientId}`, "client-data-transferred");
}
