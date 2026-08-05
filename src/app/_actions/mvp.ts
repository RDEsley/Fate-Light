"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  chargeSchema,
  clientServiceSchema,
  delayReasonSchema,
  domainSchema,
  expenseSchema,
  identifierSchema,
  optional,
  operationalDeletionSchema,
  paymentSchema,
  serviceScheduleSchema,
} from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

export async function createClientService(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const values = clientServiceSchema.safeParse({
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
  if (!clientId.success || !values.success) statusRedirect("/clientes", "service-invalid");

  const { supabase } = await requireWorkspaceContext();
  // Function parameters can receive SQL NULL, but the generated Supabase type cannot express it.
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
  if (error) statusRedirect(`/clientes/${clientId.data}`, "service-error");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/dashboard");
  statusRedirect(`/clientes/${clientId.data}`, "service-created");
}

export async function endClientService(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!clientId.success || !id.success) statusRedirect("/clientes", "service-error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_services")
    .update({ ended_at: new Date().toISOString(), status: "ended" })
    .eq("id", id.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "service-error");
  revalidatePath(`/clientes/${clientId.data}`);
  statusRedirect(`/clientes/${clientId.data}`, "service-ended");
}

export async function reactivateClientService(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!clientId.success || !id.success) statusRedirect("/clientes", "service-error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_services")
    .update({ ended_at: null, status: "active" })
    .eq("id", id.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .eq("status", "ended")
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "service-error");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/dashboard");
  statusRedirect(`/clientes/${clientId.data}`, "service-reactivated");
}

export async function updateClientServiceSchedule(formData: FormData) {
  const values = serviceScheduleSchema.safeParse({
    billingType: formData.get("billingType"),
    clientId: formData.get("clientId"),
    id: formData.get("id"),
    nextDueDate: formData.get("nextDueDate"),
  });
  if (!values.success) statusRedirect("/clientes", "service-invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_services")
    .update({ billing_type: values.data.billingType, next_due_date: values.data.nextDueDate })
    .eq("id", values.data.id)
    .eq("client_id", values.data.clientId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${values.data.clientId}`, "service-error");
  revalidatePath(`/clientes/${values.data.clientId}`);
  statusRedirect(`/clientes/${values.data.clientId}`, "service-schedule-updated");
}

export async function deleteOperationalRecord(formData: FormData) {
  const values = operationalDeletionSchema.safeParse({
    clientId: formData.get("clientId") ?? "",
    id: formData.get("id"),
    recordType: formData.get("recordType"),
  });
  if (!values.success) statusRedirect("/dashboard", "error");
  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("delete_workspace_record", {
    p_record_id: values.data.id,
    p_record_type: values.data.recordType,
  });
  const path =
    values.data.recordType === "service"
      ? `/clientes/${values.data.clientId}`
      : values.data.recordType === "charge"
        ? "/cobrancas"
        : values.data.recordType === "expense"
          ? "/despesas"
          : "/dominios";
  if (error || data === "not_found") statusRedirect(path, "delete-error");
  if (data === "blocked") statusRedirect(path, "delete-blocked");
  revalidatePath(path);
  revalidatePath("/dashboard");
  statusRedirect(path, "deleted");
}

export async function createCharge(formData: FormData) {
  const values = chargeSchema.safeParse({
    additionalFee: formData.get("additionalFee"),
    clientId: formData.get("clientId"),
    clientServiceId: formData.get("clientServiceId"),
    companyRevenue: formData.get("companyRevenue"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    mediaBudget: formData.get("mediaBudget"),
    notes: formData.get("notes"),
  });
  if (!values.success) statusRedirect("/cobrancas", "invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("charges").insert({
    additional_fee: values.data.additionalFee,
    client_id: values.data.clientId,
    client_service_id: values.data.clientServiceId || null,
    company_revenue: values.data.companyRevenue,
    description: values.data.description,
    due_date: values.data.dueDate,
    media_budget: values.data.mediaBudget,
    notes: optional(values.data.notes),
    status: "pending",
    workspace_id: workspaceId,
  });
  if (error) statusRedirect("/cobrancas", "error");
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  statusRedirect("/cobrancas", "created");
}

export async function markChargePaid(formData: FormData) {
  const values = paymentSchema.safeParse({
    id: formData.get("id"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!values.success) statusRedirect("/cobrancas", "invalid");
  const { supabase } = await requireWorkspaceContext();
  const { error } = await supabase.rpc("settle_charge_and_schedule_next", {
    p_charge_id: values.data.id,
    p_payment_method: values.data.paymentMethod,
  });
  if (error) statusRedirect("/cobrancas", "error");
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  statusRedirect("/cobrancas", "paid");
}

export async function recordChargeDelayReason(formData: FormData) {
  const values = delayReasonSchema.safeParse({
    code: formData.get("code"),
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!values.success) statusRedirect("/cobrancas", "invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("charges")
    .update({
      delay_reason: values.data.reason,
      delay_reason_code: values.data.code,
      delay_recorded_at: new Date().toISOString(),
    })
    .eq("id", values.data.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error || !data) statusRedirect("/cobrancas", "error");
  revalidatePath("/cobrancas");
  revalidatePath("/historico");
  statusRedirect("/cobrancas", "delay-recorded");
}

export async function cancelCharge(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) statusRedirect("/cobrancas", "error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("charges")
    .update({ status: "cancelled" })
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error || !data) statusRedirect("/cobrancas", "error");
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  statusRedirect("/cobrancas", "cancelled");
}

export async function createExpense(formData: FormData) {
  const values = expenseSchema.safeParse({
    amount: formData.get("amount"),
    category: formData.get("category"),
    clientId: formData.get("clientId"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    expenseType: formData.get("expenseType"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });
  if (!values.success) statusRedirect("/despesas", "invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("expenses").insert({
    amount: values.data.amount,
    category: values.data.category,
    client_id: values.data.clientId || null,
    description: values.data.description,
    due_date: values.data.dueDate,
    expense_type: values.data.expenseType,
    notes: optional(values.data.notes),
    paid_at: values.data.status === "paid" ? new Date().toISOString() : null,
    status: values.data.status,
    workspace_id: workspaceId,
  });
  if (error) statusRedirect("/despesas", "error");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  statusRedirect("/despesas", "created");
}

export async function markExpensePaid(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) statusRedirect("/despesas", "error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("expenses")
    .update({ paid_at: new Date().toISOString(), status: "paid" })
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error || !data) statusRedirect("/despesas", "error");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  statusRedirect("/despesas", "paid");
}

export async function createDomain(formData: FormData) {
  const values = domainSchema.safeParse({
    autoRenew: formData.get("autoRenew") === "on",
    clientId: formData.get("clientId"),
    cost: formData.get("cost"),
    domain: formData.get("domain"),
    expiresOn: formData.get("expiresOn"),
    notes: formData.get("notes"),
    paymentResponsibility: formData.get("paymentResponsibility"),
    registrar: formData.get("registrar"),
  });
  if (!values.success) statusRedirect("/dominios", "invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("domains").insert({
    auto_renew: values.data.autoRenew,
    client_id: values.data.clientId,
    cost: values.data.cost === "" ? null : values.data.cost,
    domain: values.data.domain,
    expires_on: values.data.expiresOn,
    notes: optional(values.data.notes),
    payment_responsibility: values.data.paymentResponsibility,
    registrar: optional(values.data.registrar),
    status: "active",
    workspace_id: workspaceId,
  });
  if (error) statusRedirect("/dominios", "error");
  revalidatePath("/dominios");
  revalidatePath("/dashboard");
  statusRedirect("/dominios", "created");
}

export async function cancelDomain(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) statusRedirect("/dominios", "error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("domains")
    .update({ status: "cancelled" })
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .select("id")
    .single();
  if (error || !data) statusRedirect("/dominios", "error");
  revalidatePath("/dominios");
  revalidatePath("/dashboard");
  statusRedirect("/dominios", "cancelled");
}
