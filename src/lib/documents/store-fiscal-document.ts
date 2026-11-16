import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fiscalDocumentFilenames,
  type FiscalDocumentKind,
} from "@/features/documents/fiscal-document";
import type { Database } from "@/types/database.generated";

export type StoreDocumentResult = "error" | "ok" | "unavailable";

/**
 * Guarda um anexo de registro pago: confere que o pai é do workspace e está pago, envia o
 * arquivo ao bucket privado e grava os metadados. Se os metadados falham, o arquivo é
 * removido para não sobrar objeto sem dono. O arquivo já deve ter passado por
 * `inspectFiscalDocument`.
 */
export async function storeFiscalDocument({
  entityId,
  entityType,
  extension,
  file,
  kind,
  supabase,
  userId,
  workspaceId,
}: {
  entityId: string;
  entityType: "charge" | "expense";
  extension: string;
  file: File;
  kind: FiscalDocumentKind;
  supabase: SupabaseClient<Database>;
  userId: string;
  workspaceId: string;
}): Promise<StoreDocumentResult> {
  const table = entityType === "charge" ? "charges" : "expenses";
  const { data: parent, error: parentError } = await supabase
    .from(table)
    .select("id, status")
    .eq("id", entityId)
    .eq("workspace_id", workspaceId)
    .single();
  if (parentError || parent?.status !== "paid") return "unavailable";

  const documentId = randomUUID();
  const safeFilename = `${fiscalDocumentFilenames[kind]}.${extension}`;
  const objectPath = `${workspaceId}/fiscal/${entityType}/${entityId}/${documentId}/${safeFilename}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const bucket = supabase.storage.from("workspace-documents");
  const { error: uploadError } = await bucket.upload(objectPath, bytes, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return "error";

  const { error: metadataError } = await supabase.from("fiscal_documents").insert({
    bucket: "workspace-documents",
    charge_id: entityType === "charge" ? entityId : null,
    checksum_sha256: checksum,
    created_by: userId,
    expense_id: entityType === "expense" ? entityId : null,
    id: documentId,
    kind,
    mime_type: file.type,
    object_path: objectPath,
    safe_filename: safeFilename,
    size_bytes: file.size,
    workspace_id: workspaceId,
  });
  if (metadataError) {
    await bucket.remove([objectPath]);
    return "error";
  }
  return "ok";
}
