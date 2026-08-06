"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { databaseErrorMessage, formErrors } from "@/features/mvp/messages";
import { actionError, rejectSubmission, type ActionState } from "@/lib/forms/action-state";
import {
  cancellationSchema,
  chargeSchema,
  delayReasonSchema,
  domainSchema,
  expenseSchema,
  identifierSchema,
  optional,
  operationalDeletionSchema,
  paymentSchema,
  serviceScheduleSchema,
  serviceStateSchema,
} from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

/** "Descrição" muda de sentido conforme a tela; o resto dos rótulos é comum. */
const chargeLabels = { description: "Descrição da cobrança" };
const expenseLabels = { description: "Descrição da despesa" };

function readDomainForm(formData: FormData) {
  return domainSchema.safeParse({
    autoRenew: formData.get("autoRenew") === "on",
    clientId: formData.get("clientId"),
    cost: formData.get("cost"),
    domain: formData.get("domain"),
    expiresOn: formData.get("expiresOn"),
    notes: formData.get("notes"),
    paymentResponsibility: formData.get("paymentResponsibility"),
    registrar: formData.get("registrar"),
  });
}

/**
 * Muda o estado de um serviço do cliente.
 * - `paused` suspende alertas e novas cobranças preservando valores e ciclos consumidos;
 * - `ended` é definitivo e exige data de encerramento;
 * - `active` retoma a agenda de onde parou.
 */
export async function setClientServiceState(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const id = identifierSchema.safeParse(formData.get("id"));
  const state = serviceStateSchema.safeParse(formData.get("state"));
  if (!clientId.success || !id.success || !state.success) {
    statusRedirect("/clientes", "service-error");
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_services")
    .update({
      ended_at: state.data === "ended" ? new Date().toISOString() : null,
      status: state.data,
    })
    .eq("id", id.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "service-error");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
  statusRedirect(
    `/clientes/${clientId.data}`,
    state.data === "ended"
      ? "service-ended"
      : state.data === "paused"
        ? "service-paused"
        : "service-resumed",
  );
}

/**
 * Liquida de uma vez as cobranças pendentes de um serviço, para o encerramento em que o
 * cliente já acertou tudo. Não agenda o próximo ciclo: o serviço está sendo fechado.
 */
export async function settleServiceCharges(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!clientId.success || !id.success) statusRedirect("/clientes", "service-error");
  const { supabase } = await requireWorkspaceContext();
  const method = String(formData.get("paymentMethod") ?? "").trim() || "Acerto final";
  const { error } = await supabase.rpc("settle_client_service_charges", {
    p_payment_method: method,
    p_service_id: id.data,
  });
  const path = `/clientes/${clientId.data}`;
  if (error) statusRedirect(path, "service-error");
  revalidatePath(path);
  revalidatePath("/cobrancas");
  revalidatePath("/historico");
  revalidatePath("/dashboard");
  statusRedirect(path, "service-settled");
}

/**
 * Remove o serviço e suas cobranças. Sem `force`, qualquer pagamento confirmado bloqueia;
 * com `force`, o dono já assumiu na interface que a receita sai do histórico (ADR-0016).
 */
export async function deleteClientService(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!clientId.success || !id.success) statusRedirect("/clientes", "delete-error");
  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("delete_client_service_cascade", {
    p_force: formData.get("force") === "on",
    p_service_id: id.data,
  });
  const path = `/clientes/${clientId.data}`;
  if (error || data === "not_found") statusRedirect(path, "delete-error");
  if (data === "blocked") statusRedirect(path, "service-delete-blocked");
  revalidatePath(path);
  revalidatePath("/cobrancas");
  revalidatePath("/historico");
  revalidatePath("/dashboard");
  statusRedirect(path, "deleted");
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
  revalidatePath("/cobrancas");
  revalidatePath("/dashboard");
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

export async function createCharge(_state: ActionState, formData: FormData): Promise<ActionState> {
  const values = chargeSchema.safeParse({
    additionalFee: formData.get("additionalFee"),
    additionalFeeIsRevenue: formData.get("additionalFeeNature") ?? "",
    alreadyPaid: formData.get("alreadyPaid") === "on",
    clientId: formData.get("clientId"),
    clientServiceId: formData.get("clientServiceId"),
    companyRevenue: formData.get("companyRevenue"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    mediaBudget: formData.get("mediaBudget"),
    notes: formData.get("notes"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, chargeLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  // Registrar uma cobrança passada já quitada evita ter que inventar histórico depois.
  const settled = values.data.alreadyPaid;
  const { data, error } = await supabase
    .from("charges")
    .insert({
      additional_fee: values.data.additionalFee,
      additional_fee_is_revenue: values.data.additionalFeeIsRevenue,
      client_id: values.data.clientId,
      client_service_id: values.data.clientServiceId || null,
      company_revenue: values.data.companyRevenue,
      description: values.data.description,
      due_date: values.data.dueDate,
      media_budget: values.data.mediaBudget,
      notes: optional(values.data.notes),
      paid_at: settled ? new Date(`${values.data.dueDate}T12:00:00.000Z`).toISOString() : null,
      payment_method: settled ? values.data.paymentMethod : null,
      status: settled ? "paid" : "pending",
      workspace_id: workspaceId,
    })
    .select("id")
    .single();
  if (error || !data) return rejectSubmission(formData, databaseErrorMessage(error));
  revalidatePath("/cobrancas");
  revalidatePath("/historico");
  revalidatePath("/dashboard");
  statusRedirect(`/cobrancas?focus=${data.id}`, settled ? "created-paid" : "created");
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
  revalidatePath("/historico");
  revalidatePath("/dashboard");
  // Sem `focus`: a cobrança acabou de descer para o bloco das resolvidas, e arrastar a
  // tela até lá tiraria o usuário de onde ele estava trabalhando.
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
  const values = cancellationSchema.safeParse({
    code: formData.get("code"),
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!values.success) statusRedirect("/cobrancas", "cancel-invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("charges")
    .update({
      cancel_reason: values.data.reason,
      cancel_reason_code: values.data.code,
      cancelled_at: new Date().toISOString(),
      status: "cancelled",
    })
    .eq("id", values.data.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .select("id")
    .single();
  if (error || !data) statusRedirect("/cobrancas", "error");
  revalidatePath("/cobrancas");
  revalidatePath("/historico");
  revalidatePath("/dashboard");
  statusRedirect(`/cobrancas?focus=${values.data.id}`, "cancelled");
}

export async function createExpense(_state: ActionState, formData: FormData): Promise<ActionState> {
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
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, expenseLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("expenses").insert({
    amount: values.data.amount,
    category: values.data.category,
    client_id: values.data.clientId || null,
    description: values.data.description,
    due_date: values.data.dueDate,
    expense_type: values.data.expenseType,
    notes: optional(values.data.notes),
    // Despesa já paga é ancorada na data informada, como a cobrança já paga: usar "agora"
    // jogava um custo antigo no período de hoje e o resultado do painel não fechava.
    paid_at:
      values.data.status === "paid"
        ? new Date(`${values.data.dueDate}T12:00:00.000Z`).toISOString()
        : null,
    status: values.data.status,
    workspace_id: workspaceId,
  });
  if (error) return rejectSubmission(formData, databaseErrorMessage(error));
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

export async function createDomain(_state: ActionState, formData: FormData): Promise<ActionState> {
  const values = readDomainForm(formData);
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error);
    return rejectSubmission(formData, message, fieldErrors);
  }
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
  if (error) return rejectSubmission(formData, databaseErrorMessage(error));
  revalidatePath("/dominios");
  revalidatePath("/dashboard");
  statusRedirect("/dominios", "created");
}

export async function updateDomain(_state: ActionState, formData: FormData): Promise<ActionState> {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) return actionError("Domínio não identificado. Recarregue a página.");
  const values = readDomainForm(formData);
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error);
    return rejectSubmission(formData, message, fieldErrors);
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("domains")
    .update({
      auto_renew: values.data.autoRenew,
      client_id: values.data.clientId,
      cost: values.data.cost === "" ? null : values.data.cost,
      domain: values.data.domain,
      expires_on: values.data.expiresOn,
      notes: optional(values.data.notes),
      payment_responsibility: values.data.paymentResponsibility,
      registrar: optional(values.data.registrar),
    })
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();
  if (error || !data) return rejectSubmission(formData, databaseErrorMessage(error));
  revalidatePath("/dominios");
  revalidatePath("/dashboard");
  statusRedirect("/dominios", "domain-updated");
}

/** Exclusão direta do domínio: diferente de cobrança, não há valor financeiro a preservar. */
export async function deleteDomain(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) statusRedirect("/dominios", "delete-error");
  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("delete_domain_record", { p_domain_id: id.data });
  if (error || data !== "deleted") statusRedirect("/dominios", "delete-error");
  revalidatePath("/dominios");
  revalidatePath("/historico");
  revalidatePath("/dashboard");
  statusRedirect("/dominios", "domain-deleted");
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
