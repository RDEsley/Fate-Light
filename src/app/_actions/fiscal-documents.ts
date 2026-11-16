"use server";

import { createHash, randomUUID } from "node:crypto";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { inspectFiscalDocument } from "@/features/documents/fiscal-document";
import { financialReturnToSchema } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const documentRequestSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(["charge", "expense"]),
});

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
  });
  if (!request.success) redirect("/dashboard?status=error");
  const back = backTo(formData, request.data.entityType);

  const file = formData.get("file");
  if (!(file instanceof File)) statusRedirect(back, "invoice-invalid");

  const inspection = await inspectFiscalDocument(file);
  if (!inspection.ok) {
    statusRedirect(back, inspection.code === "size" ? "invoice-too-large" : "invoice-invalid");
  }

  const { supabase, userId, workspaceId } = await requireWorkspaceContext();
  const table = request.data.entityType === "charge" ? "charges" : "expenses";
  const { data: parent, error: parentError } = await supabase
    .from(table)
    .select("id, status")
    .eq("id", request.data.entityId)
    .eq("workspace_id", workspaceId)
    .single();
  if (parentError || parent?.status !== "paid") {
    statusRedirect(back, "invoice-unavailable");
  }

  const documentId = randomUUID();
  const safeFilename = `nota-fiscal.${inspection.extension}`;
  const objectPath = `${workspaceId}/fiscal/${request.data.entityType}/${request.data.entityId}/${documentId}/${safeFilename}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const bucket = supabase.storage.from("workspace-documents");
  const { error: uploadError } = await bucket.upload(objectPath, bytes, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) statusRedirect(back, "invoice-error");

  const { error: metadataError } = await supabase.from("fiscal_documents").insert({
    bucket: "workspace-documents",
    charge_id: request.data.entityType === "charge" ? request.data.entityId : null,
    checksum_sha256: checksum,
    created_by: userId,
    expense_id: request.data.entityType === "expense" ? request.data.entityId : null,
    id: documentId,
    mime_type: file.type,
    object_path: objectPath,
    safe_filename: safeFilename,
    size_bytes: file.size,
    workspace_id: workspaceId,
  });

  if (metadataError) {
    await bucket.remove([objectPath]);
    statusRedirect(back, "invoice-error");
  }

  revalidateDocumentSurfaces(request.data.entityType, back);
  statusRedirect(back, "invoice-uploaded");
}

export async function downloadFiscalDocument(formData: FormData) {
  const id = documentIdSchema.safeParse(formData.get("id"));
  const entityType = z.enum(["charge", "expense"]).safeParse(formData.get("entityType"));
  if (!id.success || !entityType.success) redirect("/dashboard?status=error");
  const back = backTo(formData, entityType.data);

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: document, error } = await supabase
    .from("fiscal_documents")
    .select("bucket, object_path")
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !document) statusRedirect(back, "invoice-error");

  const { data, error: signedUrlError } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.object_path, 300, { download: true });
  if (signedUrlError || !data?.signedUrl) statusRedirect(back, "invoice-error");
  redirect(data.signedUrl as Route);
}

export async function deleteFiscalDocument(formData: FormData) {
  const id = documentIdSchema.safeParse(formData.get("id"));
  const entityType = z.enum(["charge", "expense"]).safeParse(formData.get("entityType"));
  if (!id.success || !entityType.success) redirect("/dashboard?status=error");
  const back = backTo(formData, entityType.data);

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: document, error } = await supabase
    .from("fiscal_documents")
    .select("bucket, object_path")
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !document) statusRedirect(back, "invoice-error");

  const { error: storageError } = await supabase.storage
    .from(document.bucket)
    .remove([document.object_path]);
  if (storageError) statusRedirect(back, "invoice-error");

  const { error: metadataError } = await supabase
    .from("fiscal_documents")
    .delete()
    .eq("id", id.data)
    .eq("workspace_id", workspaceId);
  if (metadataError) statusRedirect(back, "invoice-error");

  revalidateDocumentSurfaces(entityType.data, back);
  statusRedirect(back, "invoice-deleted");
}
