"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  consolidateClientSchema,
  consolidationReasonMessages,
  parseClientEntityForm,
  readConsolidationPayload,
} from "@/features/clients/entity-schemas";
import { databaseErrorMessage, formErrors } from "@/features/mvp/messages";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { actionError, rejectSubmission, type ActionState } from "@/lib/forms/action-state";

import type { ConsolidationActionState } from "./consolidation-state";

const identifierSchema = z.string().uuid();

const entityLabels = {
  displayName: "Nome da empresa/marca",
  legalName: "Razão social",
  notes: "Observações",
  taxId: "CNPJ ou CPF",
};

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

/** Empresa/marca aparece na ficha, nas listas financeiras e na contagem do dashboard. */
function revalidateEntitySurfaces(clientId: string) {
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  revalidatePath("/cobrancas");
  revalidatePath("/despesas");
  revalidatePath("/dominios");
  revalidatePath("/dashboard");
}

export async function createClientEntity(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  if (!clientId.success) return actionError("Cliente não identificado. Recarregue a página.");
  const values = parseClientEntityForm(formData);
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, entityLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }

  const { supabase, workspaceId } = await requireWorkspaceContext();
  // A FK composta (workspace_id, client_id) já barra cliente de outro workspace; o insert
  // fixa o workspace da sessão para que nem um clientId adivinhado abra outra conta.
  const { error } = await supabase.from("client_entities").insert({
    ...values.data,
    client_id: clientId.data,
    workspace_id: workspaceId,
  });
  if (error) return rejectSubmission(formData, databaseErrorMessage(error));

  revalidateEntitySurfaces(clientId.data);
  statusRedirect(`/clientes/${clientId.data}`, "entity-created");
}

export async function updateClientEntity(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const entityId = identifierSchema.safeParse(formData.get("entityId"));
  if (!clientId.success || !entityId.success) {
    return actionError("Empresa/marca não identificada. Recarregue a página.");
  }
  const values = parseClientEntityForm(formData);
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, entityLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_entities")
    .update(values.data)
    .eq("id", entityId.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();
  if (error || !data) return rejectSubmission(formData, databaseErrorMessage(error));

  revalidateEntitySurfaces(clientId.data);
  statusRedirect(`/clientes/${clientId.data}`, "entity-updated");
}

/**
 * Arquivar preserva o histórico: serviços, cobranças, despesas e domínios continuam
 * apontando para a entidade, mas ela some das opções de novos lançamentos.
 */
export async function archiveClientEntity(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const entityId = identifierSchema.safeParse(formData.get("entityId"));
  if (!clientId.success || !entityId.success) statusRedirect("/clientes", "entity-error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_entities")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", entityId.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();
  const path = `/clientes/${clientId.data}`;
  if (error || !data) statusRedirect(path, "entity-error");
  revalidateEntitySurfaces(clientId.data);
  statusRedirect(path, "entity-archived");
}

export async function restoreClientEntity(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const entityId = identifierSchema.safeParse(formData.get("entityId"));
  if (!clientId.success || !entityId.success) statusRedirect("/clientes", "entity-error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_entities")
    .update({ archived_at: null, status: "active" })
    .eq("id", entityId.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .not("archived_at", "is", null)
    .select("id")
    .single();
  const path = `/clientes/${clientId.data}`;
  if (error || !data) statusRedirect(path, "entity-error");
  revalidateEntitySurfaces(clientId.data);
  statusRedirect(path, "entity-restored");
}

function consolidationError(reason: string, fallback?: string): ConsolidationActionState {
  return {
    message: consolidationReasonMessages[reason] ?? fallback ?? "Não foi possível consolidar.",
    status: "error",
  };
}

/**
 * Prévia da consolidação. Nada é gravado: a RPC é `stable` e só conta o que seria movido,
 * porque confirmar uma fusão de clientes sem ver os números é decidir no escuro.
 */
export async function previewConsolidateClient(
  _state: ConsolidationActionState,
  formData: FormData,
): Promise<ConsolidationActionState> {
  const sourceClientId = identifierSchema.safeParse(formData.get("sourceClientId"));
  const targetClientId = identifierSchema.safeParse(formData.get("targetClientId"));
  if (!sourceClientId.success || !targetClientId.success) {
    return consolidationError("missing_ids");
  }

  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("preview_consolidate_client_into_entity", {
    p_source_client_id: sourceClientId.data,
    p_target_client_id: targetClientId.data,
  });
  if (error) return { message: databaseErrorMessage(error), status: "error" };

  const payload = readConsolidationPayload(data);
  if (!payload) return { message: "Não foi possível calcular a prévia.", status: "error" };
  if (!payload.ok) return consolidationError(payload.reason, payload.message);
  return { preview: payload, sourceClientId: sourceClientId.data, status: "preview" };
}

/**
 * Executa a consolidação. A RPC exige a frase CONSOLIDAR e recusa o próprio trabalho
 * quando os totais depois não batem com os de antes — dinheiro não pode mudar aqui.
 */
export async function consolidateClient(
  _state: ConsolidationActionState,
  formData: FormData,
): Promise<ConsolidationActionState> {
  const values = consolidateClientSchema.safeParse({
    confirmation: String(formData.get("confirmation") ?? "").trim(),
    displayName: formData.get("displayName"),
    entityType: String(formData.get("entityType") ?? "") || "company",
    sourceClientId: formData.get("sourceClientId"),
    targetClientId: formData.get("targetClientId"),
  });
  if (!values.success) {
    const confirmationFailed = values.error.issues.some(
      (issue) => issue.path[0] === "confirmation",
    );
    return consolidationError(
      confirmationFailed ? "confirmation_required" : "invalid_display_name",
    );
  }

  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("consolidate_client_into_entity", {
    p_confirmation: values.data.confirmation,
    p_entity_display_name: values.data.displayName,
    p_entity_type: values.data.entityType,
    p_source_client_id: values.data.sourceClientId,
    p_target_client_id: values.data.targetClientId,
  });
  if (error) return { message: databaseErrorMessage(error), status: "error" };

  const payload = readConsolidationPayload(data);
  if (!payload) return { message: "Não foi possível consolidar.", status: "error" };
  if (!payload.ok) return consolidationError(payload.reason, payload.message);

  revalidateEntitySurfaces(values.data.targetClientId);
  revalidatePath(`/clientes/${values.data.sourceClientId}`);
  revalidatePath("/historico");
  statusRedirect(`/clientes/${values.data.targetClientId}`, "client-consolidated");
}
