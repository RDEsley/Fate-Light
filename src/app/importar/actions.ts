"use server";

import { createHash } from "node:crypto";

import readWorkbook from "read-excel-file/node";
import { revalidatePath } from "next/cache";

import { normalizeWorkbook, parseCsv } from "@/features/import/spreadsheet";
import type { ImportActionState, ImportIssue, ImportPreview } from "@/features/import/types";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

// Keeps the complete multipart request below Vercel Functions' 4.5 MB limit.
const maximumFileSize = 4_000_000;

function identity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function readFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("file-required");
  if (file.size > maximumFileSize) throw new Error("file-too-large");
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension !== "xlsx" && extension !== "csv") throw new Error("file-type");
  const bytes = Buffer.from(await file.arrayBuffer());
  const sheets =
    extension === "csv"
      ? parseCsv(new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, ""))
      : await readWorkbook(bytes);
  return {
    digest: createHash("sha256").update(bytes).digest("hex"),
    normalized: normalizeWorkbook(sheets),
    sourceType: extension,
  } as const;
}

/**
 * A RPC transacional não grava o site do cliente. Em vez de reescrever aquela função
 * inteira por causa de uma coluna, o site é aplicado logo depois, por nome, e só onde
 * ainda estiver vazio — nunca sobrescreve o que o usuário já preencheu na interface.
 */
async function applyImportedWebsites(
  supabase: Awaited<ReturnType<typeof requireWorkspaceContext>>["supabase"],
  workspaceId: string,
  payload: Awaited<ReturnType<typeof readFile>>["normalized"]["payload"],
) {
  const withWebsite = payload.clients.filter((client) => client.website);
  if (!withWebsite.length) return;
  await Promise.all(
    withWebsite.map((client) =>
      supabase
        .from("clients")
        .update({ website: client.website })
        .eq("workspace_id", workspaceId)
        .ilike("name", client.name)
        .is("website", null),
    ),
  );
}

async function validateRelations(
  normalized: Awaited<ReturnType<typeof readFile>>["normalized"],
  issues: ImportIssue[],
) {
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const [{ data: clients, error: clientsError }, { data: services, error: servicesError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id,name")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null),
      supabase
        .from("client_services")
        .select("client_id,name")
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
    ]);
  if (clientsError || servicesError) throw new Error("lookup-failed");

  const clientNames = new Map<string, string[]>();
  clients.forEach((client) => {
    const normalizedName = identity(client.name);
    clientNames.set(normalizedName, [...(clientNames.get(normalizedName) ?? []), client.id]);
  });
  normalized.payload.clients.forEach((client) => {
    const normalizedName = identity(client.name);
    if (!clientNames.has(normalizedName)) clientNames.set(normalizedName, ["new"]);
  });
  const referencedClients = [
    ...normalized.payload.services,
    ...normalized.payload.charges,
    ...normalized.payload.expenses.filter(({ clientName }) => clientName),
    ...normalized.payload.domains,
  ];
  referencedClients.forEach((record, index) => {
    const matches = clientNames.get(identity(record.clientName)) ?? [];
    if (matches.length === 0) {
      issues.push({
        field: "Cliente",
        level: "error",
        message: `Cliente “${record.clientName}” não existe e não possui uma linha Tipo=Cliente no arquivo.`,
        row: index + 2,
        sheet: "Relacionamentos",
      });
    } else if (matches.length > 1) {
      issues.push({
        field: "Cliente",
        level: "error",
        message: `Há mais de um cliente chamado “${record.clientName}”. Renomeie ou consolide antes da importação.`,
        row: index + 2,
        sheet: "Relacionamentos",
      });
    }
  });

  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));
  const serviceKeys = new Set(
    services.map(
      (service) =>
        `${identity(clientNameById.get(service.client_id) ?? "")}|${identity(service.name)}`,
    ),
  );
  normalized.payload.services.forEach((service) =>
    serviceKeys.add(`${identity(service.clientName)}|${identity(service.name)}`),
  );
  normalized.payload.charges.forEach((charge, index) => {
    if (
      charge.serviceName &&
      !serviceKeys.has(`${identity(charge.clientName)}|${identity(charge.serviceName)}`)
    ) {
      issues.push({
        field: "Serviço",
        level: "error",
        message: `Serviço “${charge.serviceName}” não foi encontrado para ${charge.clientName}.`,
        row: index + 2,
        sheet: "Relacionamentos",
      });
    }
  });
  return { supabase, workspaceId };
}

function errorState(error: unknown): ImportActionState {
  const messages: Record<string, string> = {
    "file-required": "Selecione uma planilha antes de continuar.",
    "file-too-large": "A planilha excede 4 MB. Divida o lote em arquivos menores.",
    "file-type": "Use um arquivo .xlsx ou .csv.",
    "lookup-failed": "Não foi possível validar os relacionamentos do workspace.",
  };
  const code = error instanceof Error ? error.message : "unknown";
  return {
    message:
      messages[code] ?? "Não foi possível ler a planilha. Verifique se o arquivo está íntegro.",
    status: "error",
  };
}

export async function previewSpreadsheet(formData: FormData): Promise<ImportActionState> {
  try {
    const parsed = await readFile(formData);
    const issues = [...parsed.normalized.issues];
    await validateRelations(parsed.normalized, issues);
    const counts = {
      charges: parsed.normalized.payload.charges.length,
      clients: parsed.normalized.payload.clients.length,
      domains: parsed.normalized.payload.domains.length,
      expenses: parsed.normalized.payload.expenses.length,
      services: parsed.normalized.payload.services.length,
    };
    const preview: ImportPreview = {
      counts,
      digest: parsed.digest,
      issues: issues.slice(0, 100),
      legacy: parsed.normalized.legacy,
      rowCount: parsed.normalized.rowCount,
      sourceType: parsed.sourceType,
    };
    return {
      message: issues.some(({ level }) => level === "error")
        ? "A prévia encontrou itens que precisam ser corrigidos."
        : "Planilha validada. Revise o resumo antes de confirmar.",
      preview,
      status: "preview",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function confirmSpreadsheet(formData: FormData): Promise<ImportActionState> {
  try {
    const parsed = await readFile(formData);
    if (parsed.digest !== formData.get("digest")) {
      return { message: "O arquivo mudou após a prévia. Gere uma nova prévia.", status: "error" };
    }
    if (parsed.normalized.legacy && formData.get("acknowledgeLegacy") !== "on") {
      return {
        message: "Confirme as regras do formato legado antes de importar.",
        status: "error",
      };
    }
    const issues = [...parsed.normalized.issues];
    const { supabase, workspaceId } = await validateRelations(parsed.normalized, issues);
    if (issues.some(({ level }) => level === "error")) {
      return {
        message: "A planilha possui erros. Gere uma nova prévia após corrigir.",
        status: "error",
      };
    }
    const { data, error } = await supabase.rpc("import_workspace_spreadsheet", {
      p_payload: parsed.normalized.payload,
      p_source_checksum: parsed.digest,
      p_source_type: parsed.sourceType,
      p_workspace_id: workspaceId,
    });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return {
        message: "A importação foi cancelada sem gravar dados. Revise a planilha.",
        status: "error",
      };
    }
    const result = data as { counts?: Record<string, number>; status?: string };
    const duplicate = result.status === "duplicate";
    if (!duplicate) await applyImportedWebsites(supabase, workspaceId, parsed.normalized.payload);
    revalidatePath("/dashboard");
    revalidatePath("/clientes");
    revalidatePath("/cobrancas");
    revalidatePath("/despesas");
    revalidatePath("/dominios");
    revalidatePath("/importar");
    return {
      message: duplicate
        ? "Este mesmo arquivo já foi importado. Nenhum registro foi duplicado."
        : "Importação concluída com sucesso.",
      result: { counts: result.counts ?? {}, duplicate },
      status: "success",
    };
  } catch (error) {
    return errorState(error);
  }
}
