"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseClientForm } from "@/features/clients/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const identifierSchema = z.string().uuid();
const clientStatusSchema = z.enum(["active", "inactive"]);

function statusRedirect(path: string, status: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}status=${status}` as Route);
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
  statusRedirect("/clientes", status.data === "active" ? "activated" : "inactivated");
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
