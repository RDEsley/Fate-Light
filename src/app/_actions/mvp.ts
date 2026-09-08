"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { databaseErrorMessage, formErrors } from "@/features/mvp/messages";
import { actionError, rejectSubmission, type ActionState } from "@/lib/forms/action-state";
import {
  cancellationSchema,
  chargeSchema,
  delayReasonSchema,
  domainSchema,
  expenseSchema,
  financialReturnToSchema,
  identifierSchema,
  optional,
  operationalDeletionSchema,
  paidFinancialDeletionSchema,
  paymentSchema,
  serviceScheduleSchema,
  serviceStateSchema,
} from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { revalidateFinancialSurfaces } from "@/lib/cache/revalidate-financial-surfaces";
import { revalidatePath } from "next/cache";

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

/** Destino pós-mutação: /cobrancas, /despesas ou /clientes/{uuid}. */
function resolveFinancialReturnTo(raw: FormDataEntryValue | null, fallback: string): string {
  const parsed = financialReturnToSchema.safeParse(String(raw ?? "").trim());
  return parsed.success ? parsed.data : fallback;
}

function parsePaidDeleteResult(data: unknown): {
  objectPaths: string[];
  status: string;
} {
  if (!data || typeof data !== "object") return { objectPaths: [], status: "error" };
  const record = data as { object_paths?: unknown; status?: unknown };
  const status = typeof record.status === "string" ? record.status : "error";
  const paths = Array.isArray(record.object_paths)
    ? record.object_paths.filter((path): path is string => typeof path === "string")
    : [];
  return { objectPaths: paths, status };
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
  revalidateFinancialSurfaces({ clientId: clientId.data, includeCharges: true });
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
  if (data === "documents_attached") statusRedirect(path, "service-documents-attached");
  if (data === "blocked") statusRedirect(path, "service-delete-blocked");
  revalidateFinancialSurfaces({ clientId: clientId.data, includeCharges: true });
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
  revalidateFinancialSurfaces({ clientId: values.data.clientId, includeCharges: true });
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
  if (values.data.recordType === "charge") {
    revalidateFinancialSurfaces({
      clientId: values.data.clientId || null,
      includeCharges: true,
    });
  } else if (values.data.recordType === "expense") {
    revalidateFinancialSurfaces({
      clientId: values.data.clientId || null,
      includeExpenses: true,
    });
  } else if (values.data.recordType === "service") {
    revalidateFinancialSurfaces({ clientId: values.data.clientId, includeCharges: true });
  } else {
    revalidatePath(path);
    revalidatePath("/dashboard");
  }
  statusRedirect(path, "deleted");
}

/**
 * Exclusão corretiva de cobrança/despesa já paga: remove metadados fiscais no banco
 * e limpa o Storage privado com os object_paths devolvidos pela RPC.
 */
export async function deletePaidFinancialRecord(formData: FormData) {
  const values = paidFinancialDeletionSchema.safeParse({
    id: formData.get("id"),
    recordType: formData.get("recordType"),
    returnTo: formData.get("returnTo") ?? "",
  });
  const fallback =
    values.success && values.data.recordType === "expense" ? "/despesas" : "/cobrancas";
  if (!values.success) statusRedirect(fallback, "delete-error");

  const returnTo = resolveFinancialReturnTo(
    values.data.returnTo && values.data.returnTo !== "" ? values.data.returnTo : null,
    fallback,
  );

  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("delete_paid_financial_record", {
    p_record_id: values.data.id,
    p_record_type: values.data.recordType,
  });
  const result = parsePaidDeleteResult(data);
  if (error || result.status === "not_found") statusRedirect(returnTo, "delete-error");
  if (result.status === "blocked") statusRedirect(returnTo, "delete-blocked");
  if (result.status !== "deleted") statusRedirect(returnTo, "delete-error");

  if (result.objectPaths.length) {
    await supabase.storage.from("workspace-documents").remove(result.objectPaths);
  }

  const clientMatch = returnTo.match(/^\/clientes\/([0-9a-f-]{36})$/i);
  revalidateFinancialSurfaces({
    clientId: clientMatch?.[1] ?? null,
    includeCharges: values.data.recordType === "charge",
    includeExpenses: values.data.recordType === "expense",
  });
  statusRedirect(returnTo, "paid-deleted");
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
  const returnTo = resolveFinancialReturnTo(
    formData.get("returnTo"),
    `/clientes/${values.data.clientId}`,
  );
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
  revalidateFinancialSurfaces({ clientId: values.data.clientId, includeCharges: true });
  if (returnTo.startsWith("/clientes/")) {
    statusRedirect(returnTo, "charge-created");
  }
  statusRedirect(`${returnTo}?focus=${data.id}`, settled ? "created-paid" : "created");
}

export async function markChargePaid(formData: FormData) {
  const values = paymentSchema.safeParse({
    id: formData.get("id"),
    paymentMethod: formData.get("paymentMethod"),
  });
  const returnTo = resolveFinancialReturnTo(formData.get("returnTo"), "/cobrancas");
  if (!values.success) statusRedirect(returnTo, "invalid");
  const { supabase } = await requireWorkspaceContext();
  const { error } = await supabase.rpc("settle_charge_and_schedule_next", {
    p_charge_id: values.data.id,
    p_payment_method: values.data.paymentMethod,
  });
  if (error) statusRedirect(returnTo, "error");
  const clientMatch = returnTo.match(/^\/clientes\/([0-9a-f-]{36})$/i);
  revalidateFinancialSurfaces({
    clientId: clientMatch?.[1] ?? null,
    includeCharges: true,
  });
  // Sem `focus`: a cobrança acabou de descer para o bloco das resolvidas, e arrastar a
  // tela até lá tiraria o usuário de onde ele estava trabalhando.
  statusRedirect(returnTo, "paid");
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
  revalidateFinancialSurfaces({ includeCharges: true });
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
  revalidateFinancialSurfaces({ includeCharges: true });
  statusRedirect(`/cobrancas?focus=${values.data.id}`, "cancelled");
}

export async function createExpense(_state: ActionState, formData: FormData): Promise<ActionState> {
  const values = expenseSchema.safeParse({
    amount: formData.get("amount"),
    category: formData.get("category"),
    clientId: formData.get("clientId"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    enableRecurrence: formData.get("enableRecurrence") === "on",
    expenseType: formData.get("expenseType"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });
  if (!values.success) {
    const { fieldErrors, message } = formErrors(values.error, expenseLabels);
    return rejectSubmission(formData, message, fieldErrors);
  }
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const clientId = values.data.clientId || null;

  if (values.data.enableRecurrence && values.data.expenseType === "fixed") {
    const { error } = await supabase.rpc("create_expense_with_recurrence", {
      p_amount: values.data.amount,
      p_category: values.data.category,
      p_client_id: clientId ?? undefined,
      p_description: values.data.description,
      p_due_date: values.data.dueDate,
      p_enable_recurrence: true,
      p_expense_type: values.data.expenseType,
      p_notes: optional(values.data.notes) ?? undefined,
      p_status: values.data.status,
    });
    if (error) return rejectSubmission(formData, databaseErrorMessage(error));
  } else {
    const { error } = await supabase.from("expenses").insert({
      amount: values.data.amount,
      category: values.data.category,
      client_id: clientId,
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
  }

  revalidateFinancialSurfaces({ clientId, includeExpenses: true });
  statusRedirect("/despesas", "created");
}

export async function markExpensePaid(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) statusRedirect("/despesas", "error");
  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("settle_expense_and_schedule_next", {
    p_expense_id: id.data,
  });
  if (error || !data || typeof data !== "object") statusRedirect("/despesas", "error");
  const status =
    typeof (data as { status?: unknown }).status === "string"
      ? (data as { status: string }).status
      : "";
  if (status === "not_found") statusRedirect("/despesas", "error");
  if (status !== "settled") statusRedirect("/despesas", "error");
  revalidateFinancialSurfaces({ includeExpenses: true });
  const scheduled = Boolean((data as { scheduled?: unknown }).scheduled);
  statusRedirect("/despesas", scheduled ? "expense-next-scheduled" : "paid");
}

export async function stopExpenseRecurrence(formData: FormData) {
  const id = identifierSchema.safeParse(formData.get("id"));
  if (!id.success) statusRedirect("/despesas", "error");
  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("stop_expense_recurrence", {
    p_expense_id: id.data,
  });
  if (error || !data || typeof data !== "object") statusRedirect("/despesas", "error");
  const status =
    typeof (data as { status?: unknown }).status === "string"
      ? (data as { status: string }).status
      : "";
  if (status === "not_found") statusRedirect("/despesas", "error");
  if (status === "not_recurring") statusRedirect("/despesas", "expense-not-recurring");
  if (status !== "stopped") statusRedirect("/despesas", "error");
  revalidateFinancialSurfaces({ includeExpenses: true });
  statusRedirect("/despesas", "expense-recurrence-stopped");
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
