"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { databaseErrorMessage, formErrors } from "@/features/mvp/messages";
import { identifierSchema, optional, serviceCatalogSchema } from "@/features/mvp/schemas";
import { actionError, rejectSubmission, type ActionState } from "@/lib/forms/action-state";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

/** "Nome" e "Descrição" aqui são do item de catálogo. */
const catalogLabels = { description: "Descrição do serviço", name: "Nome do serviço" };

function finish(status: string): never {
  redirect(`/servicos?status=${status}`);
}

function parseService(formData: FormData) {
  return serviceCatalogSchema.safeParse({
    adjustmentIntervalMonths: formData.get("adjustmentIntervalMonths"),
    adjustmentRate: formData.get("adjustmentRate"),
    billingType: formData.get("billingType"),
    defaultPrice: formData.get("defaultPrice"),
    description: formData.get("description"),
    name: formData.get("name"),
  });
}

export async function createCatalogService(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = parseService(formData);
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, catalogLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("services").insert({
    active: true,
    default_adjustment_interval_months: values.data.adjustmentIntervalMonths,
    default_adjustment_rate: values.data.adjustmentRate,
    default_billing_type: values.data.billingType,
    default_price: values.data.defaultPrice,
    description: optional(values.data.description),
    name: values.data.name,
    workspace_id: workspaceId,
  });
  if (error) return rejectSubmission(formData, databaseErrorMessage(error));
  revalidatePath("/servicos");
  finish("service-created");
}

export async function updateCatalogService(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) return actionError("Serviço não identificado. Recarregue a página.");
  const values = parseService(formData);
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, catalogLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("services")
    .update({
      default_adjustment_interval_months: values.data.adjustmentIntervalMonths,
      default_adjustment_rate: values.data.adjustmentRate,
      default_billing_type: values.data.billingType,
      default_price: values.data.defaultPrice,
      description: optional(values.data.description),
      name: values.data.name,
    })
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) return rejectSubmission(formData, databaseErrorMessage(error));
  revalidatePath("/servicos");
  finish("service-updated");
}

/**
 * Remove um serviço do catálogo. Sem `detach`, o banco bloqueia enquanto algum cliente o
 * utiliza; com `detach`, os serviços dos clientes seguem ativos e apenas perdem o vínculo.
 */
export async function deleteCatalogService(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) finish("service-error");
  const { supabase } = await requireWorkspaceContext();
  const detach = formData.get("detach") === "on";
  const { data, error } = await supabase.rpc("delete_catalog_service", {
    p_detach: detach,
    p_service_id: id.data,
  });
  if (error || data === "not_found") finish("service-error");
  if (data === "blocked") finish("service-delete-blocked");
  revalidatePath("/servicos");
  revalidatePath("/clientes");
  finish(detach ? "service-detached" : "service-deleted");
}

export async function toggleCatalogService(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!id.success) finish("service-error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("services")
    .update({ active })
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) finish("service-error");
  revalidatePath("/servicos");
  finish(active ? "service-activated" : "service-inactivated");
}
