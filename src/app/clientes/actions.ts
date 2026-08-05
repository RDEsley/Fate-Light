"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseClientForm, parsePriorRevenue } from "@/features/clients/schemas";
import { clientStatusValues } from "@/features/clients/status";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const identifierSchema = z.string().uuid();
const clientStatusSchema = z.enum(clientStatusValues);

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
}

/** Registra em uma única cobrança quitada tudo o que o cliente já pagou antes do sistema. */
async function recordPriorRevenue(
  supabase: Awaited<ReturnType<typeof requireWorkspaceContext>>["supabase"],
  workspaceId: string,
  clientId: string,
  formData: FormData,
) {
  const prior = parsePriorRevenue(formData);
  if (!prior) return;
  await supabase.from("charges").insert({
    client_id: clientId,
    company_revenue: prior.priorRevenue,
    description: "Histórico anterior ao sistema",
    due_date: prior.priorRevenueDate,
    notes: "Valor consolidado informado no cadastro do cliente.",
    paid_at: new Date(`${prior.priorRevenueDate}T12:00:00.000Z`).toISOString(),
    payment_method: "Histórico",
    status: "paid",
    workspace_id: workspaceId,
  });
}

export async function createClient(formData: FormData) {
  const values = parseClientForm(formData);
  if (!values) statusRedirect("/clientes/novo", "invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...values, workspace_id: workspaceId })
    .select("id")
    .single();
  if (error || !data) statusRedirect("/clientes/novo", "error");
  await recordPriorRevenue(supabase, workspaceId, data.id, formData);
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  statusRedirect(`/clientes/${data.id}`, "created");
}

export async function updateClient(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const values = parseClientForm(formData);
  if (!clientId.success) statusRedirect("/clientes", "error");
  if (!values) statusRedirect(`/clientes/${clientId.data}/editar`, "invalid");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("clients")
    .update(values)
    .eq("id", clientId.data)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${clientId.data}/editar`, "error");
  await recordPriorRevenue(supabase, workspaceId, clientId.data, formData);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/dashboard");
  statusRedirect(`/clientes/${clientId.data}`, "updated");
}

export async function setClientStatus(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const status = clientStatusSchema.safeParse(formData.get("clientStatus"));
  if (!clientId.success || !status.success) statusRedirect("/clientes", "error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("clients")
    .update({ commercial_status: status.data })
    .eq("id", clientId.data)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();
  if (error || !data) statusRedirect("/clientes", "error");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/dashboard");
  statusRedirect(`/clientes/${clientId.data}`, "status-updated");
}

/**
 * Arquivar tira o cliente da operação diária preservando todo o histórico. É a saída
 * recomendada quando a exclusão está bloqueada por cobranças, serviços ou domínios.
 */
export async function archiveClient(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  if (!clientId.success) statusRedirect("/clientes", "error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString(), commercial_status: "archived" })
    .eq("id", clientId.data)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id")
    .single();
  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "error");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/dashboard");
  statusRedirect("/clientes?state=archived", "archived");
}

export async function restoreClient(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  if (!clientId.success) statusRedirect("/clientes", "error");
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("clients")
    .update({ archived_at: null, commercial_status: "inactive" })
    .eq("id", clientId.data)
    .eq("workspace_id", workspaceId)
    .not("archived_at", "is", null)
    .select("id")
    .single();
  if (error || !data) statusRedirect("/clientes?state=archived", "error");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId.data}`);
  revalidatePath("/dashboard");
  statusRedirect(`/clientes/${clientId.data}`, "restored");
}

export async function deleteClient(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  if (!clientId.success) statusRedirect("/clientes", "delete-error");
  const { supabase } = await requireWorkspaceContext();
  const { data, error } = await supabase.rpc("delete_client_record", {
    p_client_id: clientId.data,
  });
  if (error || data === "not_found") statusRedirect(`/clientes/${clientId.data}`, "delete-error");
  if (data === "blocked") statusRedirect(`/clientes/${clientId.data}`, "delete-blocked");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  statusRedirect("/clientes", "deleted");
}
