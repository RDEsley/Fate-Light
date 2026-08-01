"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  chargeSchema,
  clientServiceSchema,
  domainSchema,
  expenseSchema,
  identifierSchema,
  optional,
  paymentSchema,
} from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

export async function createClientService(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const values = clientServiceSchema.safeParse({
    additionalFee: formData.get("additionalFee"),
    billingType: formData.get("billingType"),
    companyRevenue: formData.get("companyRevenue"),
    description: formData.get("description"),
    mediaBudget: formData.get("mediaBudget"),
    name: formData.get("name"),
    nextDueDate: formData.get("nextDueDate"),
    notes: formData.get("notes"),
    startDate: formData.get("startDate"),
  });
  if (!clientId.success || !values.success) statusRedirect("/clientes", "service-invalid");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("client_services").insert({
    additional_fee: values.data.additionalFee,
    billing_type: values.data.billingType,
    client_id: clientId.data,
    company_revenue: values.data.companyRevenue,
    description: optional(values.data.description),
    media_budget: values.data.mediaBudget,
    name: values.data.name,
    next_due_date: values.data.nextDueDate,
    notes: optional(values.data.notes),
    start_date: values.data.startDate,
    status: "active",
    workspace_id: workspaceId,
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
    .update({ status: "ended" })
    .eq("id", id.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "service-error");
  revalidatePath(`/clientes/${clientId.data}`);
  statusRedirect(`/clientes/${clientId.data}`, "service-ended");
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
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("charges")
    .update({
      paid_at: new Date().toISOString(),
      payment_method: values.data.paymentMethod,
      status: "paid",
    })
    .eq("id", values.data.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error || !data) statusRedirect("/cobrancas", "error");
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  statusRedirect("/cobrancas", "paid");
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
