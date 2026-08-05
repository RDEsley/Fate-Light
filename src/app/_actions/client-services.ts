"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  databaseErrorMessage,
  fieldErrorsFrom,
  summarizeFieldErrors,
} from "@/features/mvp/messages";
import { clientServiceSchema, identifierSchema } from "@/features/mvp/schemas";
import { actionError, type ActionState } from "@/lib/forms/action-state";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

function readServiceForm(formData: FormData) {
  return clientServiceSchema.safeParse({
    additionalFee: formData.get("additionalFee"),
    adjustmentIntervalMonths: formData.get("adjustmentIntervalMonths"),
    adjustmentRate: formData.get("adjustmentRate"),
    billingType: formData.get("billingType"),
    description: formData.get("description"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    installmentCount: formData.get("installmentCount"),
    listPrice: formData.get("listPrice"),
    mediaBudget: formData.get("mediaBudget"),
    name: formData.get("name"),
    nextDueDate: formData.get("nextDueDate"),
    notes: formData.get("notes"),
    promotionalCycles: formData.get("promotionalCycles"),
    promotionalPrice: formData.get("promotionalPrice"),
    serviceId: formData.get("serviceId"),
    startDate: formData.get("startDate"),
  });
}

/**
 * Aplica um serviço ao cliente devolvendo erro por campo em vez de redirecionar com um
 * status genérico: o formulário continua preenchido e aponta exatamente o que revisar.
 */
export async function applyServiceToClient(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  if (!clientId.success) return actionError("Cliente não identificado. Recarregue a página.");

  const values = readServiceForm(formData);
  if (!values.success) {
    const fieldErrors = fieldErrorsFrom(values.error);
    return actionError(summarizeFieldErrors(fieldErrors), fieldErrors);
  }

  const { supabase } = await requireWorkspaceContext();
  // Os parâmetros da função aceitam NULL, mas o tipo gerado do Supabase não expressa isso.
  const sqlNullable = <Value>(value: Value | null) => value as Value;
  const { error } = await supabase.rpc("apply_service_to_client", {
    p_additional_fee: values.data.additionalFee,
    p_adjustment_interval_months: sqlNullable(values.data.adjustmentIntervalMonths),
    p_adjustment_rate: sqlNullable(values.data.adjustmentRate),
    p_billing_type: values.data.billingType,
    p_client_id: clientId.data,
    p_description: values.data.description,
    p_discount_type: values.data.discountType,
    p_discount_value: values.data.discountValue,
    p_installment_count: values.data.installmentCount,
    p_list_price: values.data.listPrice,
    p_media_budget: values.data.mediaBudget,
    p_name: values.data.name,
    p_next_due_date: values.data.nextDueDate,
    p_notes: values.data.notes,
    p_promotional_cycles: sqlNullable(values.data.promotionalCycles),
    p_promotional_price: sqlNullable(values.data.promotionalPrice),
    p_service_id: sqlNullable(values.data.serviceId || null),
    p_start_date: values.data.startDate,
  });
  if (error) return actionError(databaseErrorMessage(error));

  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/servicos");
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  redirect(`/clientes/${clientId.data}?status=service-created` as Route);
}

/**
 * Edita um serviço já aplicado. Cobranças pagas nunca são tocadas; as pendentes futuras
 * acompanham o novo valor para que a agenda continue coerente.
 */
export async function editClientService(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const serviceId = identifierSchema.safeParse(formData.get("id"));
  if (!clientId.success || !serviceId.success) {
    return actionError("Serviço não identificado. Recarregue a página.");
  }

  const values = readServiceForm(formData);
  if (!values.success) {
    const fieldErrors = fieldErrorsFrom(values.error);
    return actionError(summarizeFieldErrors(fieldErrors), fieldErrors);
  }

  const { discountType, discountValue, listPrice } = values.data;
  const companyRevenue =
    discountType === "percentage"
      ? listPrice * (1 - discountValue / 100)
      : discountType === "fixed"
        ? listPrice - discountValue
        : listPrice;
  const appliedRevenue = Math.round(Math.max(0, companyRevenue) * 100) / 100;

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_services")
    .update({
      additional_fee: values.data.additionalFee,
      adjustment_interval_months: values.data.adjustmentIntervalMonths,
      adjustment_rate: values.data.adjustmentRate,
      billing_type: values.data.billingType,
      company_revenue: appliedRevenue,
      description: values.data.description || null,
      discount_type: discountType,
      discount_value: discountValue,
      list_price: listPrice,
      media_budget: values.data.mediaBudget,
      name: values.data.name,
      next_due_date: values.data.nextDueDate,
      notes: values.data.notes || null,
      promotional_cycles: values.data.promotionalCycles,
      promotional_price: values.data.promotionalPrice,
    })
    .eq("id", serviceId.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) return actionError(databaseErrorMessage(error));

  const { error: chargesError } = await supabase
    .from("charges")
    .update({
      additional_fee: values.data.additionalFee,
      company_revenue: appliedRevenue,
      media_budget: values.data.mediaBudget,
    })
    .eq("client_service_id", serviceId.data)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .is("paid_at", null);
  if (chargesError) return actionError(databaseErrorMessage(chargesError));

  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  redirect(`/clientes/${clientId.data}?status=service-updated` as Route);
}
