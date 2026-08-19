"use server";

import { createHash, randomUUID } from "node:crypto";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { inspectFiscalDocument } from "@/features/documents/fiscal-document";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const documentRequestSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(["charge", "expense"]),
});

const documentIdSchema = z.string().uuid();

function pageFor(entityType: "charge" | "expense") {
  return entityType === "charge" ? "/cobrancas" : "/despesas";
}

function statusRedirect(entityType: "charge" | "expense", status: string): never {
  redirect(`${pageFor(entityType)}?status=${status}` as Route);
}

export async function uploadFiscalDocument(formData: FormData) {
  const request = documentRequestSchema.safeParse({
    entityId: formData.get("entityId"),
    entityType: formData.get("entityType"),
  });
  if (!request.success) redirect("/dashboard?status=error");

  const file = formData.get("file");
  if (!(file instanceof File)) statusRedirect(request.data.entityType, "invoice-invalid");

  const inspection = await inspectFiscalDocument(file);
  if (!inspection.ok) {
    statusRedirect(
      request.data.entityType,
      inspection.code === "size" ? "invoice-too-large" : "invoice-invalid",
    );
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
    statusRedirect(request.data.entityType, "invoice-unavailable");
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
  if (uploadError) statusRedirect(request.data.entityType, "invoice-error");

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
    statusRedirect(request.data.entityType, "invoice-error");
  }

  revalidatePath(pageFor(request.data.entityType));
  statusRedirect(request.data.entityType, "invoice-uploaded");
}

export async function downloadFiscalDocument(formData: FormData) {
  const id = documentIdSchema.safeParse(formData.get("id"));
  const entityType = z.enum(["charge", "expense"]).safeParse(formData.get("entityType"));
  if (!id.success || !entityType.success) redirect("/dashboard?status=error");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: document, error } = await supabase
    .from("fiscal_documents")
    .select("bucket, object_path")
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !document) statusRedirect(entityType.data, "invoice-error");

  const { data, error: signedUrlError } = await supabase.storage
    .from(document.bucket)
    .createSignedUrl(document.object_path, 300, { download: true });
  if (signedUrlError || !data?.signedUrl) statusRedirect(entityType.data, "invoice-error");
  redirect(data.signedUrl as Route);
}

export async function deleteFiscalDocument(formData: FormData) {
  const id = documentIdSchema.safeParse(formData.get("id"));
  const entityType = z.enum(["charge", "expense"]).safeParse(formData.get("entityType"));
  if (!id.success || !entityType.success) redirect("/dashboard?status=error");

  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: document, error } = await supabase
    .from("fiscal_documents")
    .select("bucket, object_path")
    .eq("id", id.data)
    .eq("workspace_id", workspaceId)
    .single();
  if (error || !document) statusRedirect(entityType.data, "invoice-error");

  const { error: storageError } = await supabase.storage
    .from(document.bucket)
    .remove([document.object_path]);
  if (storageError) statusRedirect(entityType.data, "invoice-error");

  const { error: metadataError } = await supabase
    .from("fiscal_documents")
    .delete()
    .eq("id", id.data)
    .eq("workspace_id", workspaceId);
  if (metadataError) statusRedirect(entityType.data, "invoice-error");

  revalidatePath(pageFor(entityType.data));
  statusRedirect(entityType.data, "invoice-deleted");
}
