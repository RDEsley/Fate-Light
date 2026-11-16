"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { inspectFiscalDocument } from "@/features/documents/fiscal-document";
import { financialReturnToSchema } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { storeFiscalDocument } from "@/lib/documents/store-fiscal-document";

const kindSchema = z.enum(["invoice", "payment_proof"]).default("invoice");

// Comprovante é do recebimento de uma cobrança; despesa só tem nota fiscal.
const documentRequestSchema = z
  .object({
    entityId: z.string().uuid(),
    entityType: z.enum(["charge", "expense"]),
    kind: kindSchema,
  })
  .refine((value) => value.kind === "invoice" || value.entityType === "charge");

/** Prefixo dos códigos de retorno: o texto da mensagem muda entre nota e comprovante. */
function codePrefix(kind: z.infer<typeof kindSchema>) {
  return kind === "payment_proof" ? "proof" : "invoice";
}

const documentIdSchema = z.string().uuid();

function pageFor(entityType: "charge" | "expense") {
  return entityType === "charge" ? "/cobrancas" : "/despesas";
}

/**
 * Tela para onde a ação volta. A ficha do cliente também mostra cobranças pagas com o painel
 * de notas: sem isto, anexar ali jogava o usuário na lista de cobranças.
 */
function backTo(formData: FormData, entityType: "charge" | "expense") {
  const parsed = financialReturnToSchema.safeParse(String(formData.get("returnTo") ?? ""));
  return parsed.success ? parsed.data : pageFor(entityType);
}

function statusRedirect(path: string, status: string): never {
  redirect(`${path}?status=${status}` as Route);
}

/** Lista do tipo do registro e, quando a ação veio da ficha, a ficha também. */
function revalidateDocumentSurfaces(entityType: "charge" | "expense", path: string) {
  revalidatePath(pageFor(entityType));
  if (path !== pageFor(entityType)) revalidatePath(path);
}

export async function uploadFiscalDocument(formData: FormData) {
  const request = documentRequestSchema.safeParse({
    entityId: formData.get("entityId"),
    entityType: formData.get("entityType"),
    kind: formData.get("kind") ?? undefined,
  });
  if (!request.success) redirect("/dashboard?status=error");
  const back = backTo(formData, request.data.entityType);
  const prefix = codePrefix(request.data.kind);

  const file = formData.get("file");
  if (!(file instanceof File)) statusRedirect(back, `${prefix}-invalid`);

  const inspection = await inspectFiscalDocument(file);
  if (!inspection.ok) {
    statusRedirect(back, inspection.code === "size" ? `${prefix}-too-large` : `${prefix}-invalid`);
  }

  const { supabase, userId, workspaceId } = await requireWorkspaceContext();
  const result = await storeFiscalDocument({
    entityId: request.data.entityId,
    entityType: request.data.entityType,
    extension: inspection.extension,
    file,
    kind: request.data.kind,
    supabase,
    userId,
    workspaceId,
  });
  if (result === "unavailable") statusRedirect(back, `${prefix}-unavailable`);
  if (result === "error") statusRedirect(back, `${prefix}-error`);

  revalidateDocumentSurfaces(request.data.entityType, back);
  statusRedirect(back, `${prefix}-uploaded`);
}

export async function downloadFiscalDocument(formData: FormData) {
  const id = documentIdSchema.safeParse(formData.get("id"));
  const entityType = z.enum(["charge", "expense"]).safeParse(formData.get("entityType"));
  const kind = kindSchema.safeParse(formData.get("kind") ?? undefined);
  if (!id.success || !entityType.success || !kind.success) redirect("/dashboard?status=error");
  const back = backTo(formData, entityType.data);
  const prefix = codePrefix(kind.data);

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: document, error } = await supabase
    .from("fiscal_documents")
    .select("bucket, object_path")
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !document) statusRedirect(back, `${prefix}-error`);

  const { data, error: signedUrlError } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.object_path, 300, { download: true });
  if (signedUrlError || !data?.signedUrl) statusRedirect(back, `${prefix}-error`);
  redirect(data.signedUrl as Route);
}

export async function deleteFiscalDocument(formData: FormData) {
  const id = documentIdSchema.safeParse(formData.get("id"));
  const entityType = z.enum(["charge", "expense"]).safeParse(formData.get("entityType"));
  const kind = kindSchema.safeParse(formData.get("kind") ?? undefined);
  if (!id.success || !entityType.success || !kind.success) redirect("/dashboard?status=error");
  const back = backTo(formData, entityType.data);
  const prefix = codePrefix(kind.data);

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: document, error } = await supabase
    .from("fiscal_documents")
    .select("bucket, object_path")
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !document) statusRedirect(back, `${prefix}-error`);

  const { error: storageError } = await supabase.storage
    .from(document.bucket)
    .remove([document.object_path]);
  if (storageError) statusRedirect(back, `${prefix}-error`);

  const { error: metadataError } = await supabase
    .from("fiscal_documents")
    .delete()
    .eq("id", id.data)
    .eq("workspace_id", workspaceId);
  if (metadataError) statusRedirect(back, `${prefix}-error`);

  revalidateDocumentSurfaces(entityType.data, back);
  statusRedirect(back, `${prefix}-deleted`);
}
