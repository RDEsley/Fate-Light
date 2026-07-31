"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseClientForm, parseContactForm } from "@/features/clients/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const identifierSchema = z.string().uuid();

function statusRedirect(path: string, status: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}status=${status}` as Route);
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
    .select("id")
    .single();

  if (error || !data) statusRedirect(`/clientes/${clientId.data}/editar`, "error");

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId.data}`);
  statusRedirect(`/clientes/${clientId.data}`, "updated");
}

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
  statusRedirect("/clientes", "archived");
}

export async function restoreClient(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  if (!clientId.success) statusRedirect("/clientes", "error");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("clients")
    .update({ archived_at: null, commercial_status: "active" })
    .eq("id", clientId.data)
    .eq("workspace_id", workspaceId)
    .not("archived_at", "is", null)
    .select("id")
    .single();

  if (error || !data) statusRedirect("/clientes?view=archived", "error");

  revalidatePath("/clientes");
  statusRedirect(`/clientes/${clientId.data}`, "restored");
}

export async function createContact(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const values = parseContactForm(formData);
  if (!clientId.success) statusRedirect("/clientes", "error");
  if (!values) statusRedirect(`/clientes/${clientId.data}`, "contact-invalid");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { error } = await supabase.from("client_contacts").insert({
    ...values,
    client_id: clientId.data,
    workspace_id: workspaceId,
  });

  if (error) statusRedirect(`/clientes/${clientId.data}`, "contact-error");

  revalidatePath(`/clientes/${clientId.data}`);
  statusRedirect(`/clientes/${clientId.data}`, "contact-created");
}

export async function updateContact(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const contactId = identifierSchema.safeParse(formData.get("contactId"));
  const values = parseContactForm(formData);
  if (!clientId.success || !contactId.success) statusRedirect("/clientes", "error");
  if (!values) statusRedirect(`/clientes/${clientId.data}`, "contact-invalid");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_contacts")
    .update(values)
    .eq("id", contactId.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();

  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "contact-error");

  revalidatePath(`/clientes/${clientId.data}`);
  statusRedirect(`/clientes/${clientId.data}`, "contact-updated");
}

export async function archiveContact(formData: FormData) {
  const clientId = identifierSchema.safeParse(formData.get("clientId"));
  const contactId = identifierSchema.safeParse(formData.get("contactId"));
  if (!clientId.success || !contactId.success) statusRedirect("/clientes", "error");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data, error } = await supabase
    .from("client_contacts")
    .update({ archived_at: new Date().toISOString(), is_primary: false })
    .eq("id", contactId.data)
    .eq("client_id", clientId.data)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();

  if (error || !data) statusRedirect(`/clientes/${clientId.data}`, "contact-error");

  revalidatePath(`/clientes/${clientId.data}`);
  statusRedirect(`/clientes/${clientId.data}`, "contact-archived");
}
