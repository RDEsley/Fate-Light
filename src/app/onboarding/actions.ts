"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  fallbackAlertOffsets,
  maxAlertOffsetDays,
  maxAlertOffsets,
} from "@/features/alerts/offsets";
import { actionError, rejectSubmission, type ActionState } from "@/lib/forms/action-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const defaultTimezone = "America/Sao_Paulo";

// Só o nome da pessoa, o da empresa e os aceites são obrigatórios. Todo o resto tem um
// padrão sensato e pode ser ajustado depois em Perfil e em Configurações da empresa.
const onboardingSchema = z.object({
  acceptedLegalDocumentIds: z.array(z.string().uuid()).min(1),
  accountingBasis: z.enum(["cash", "accrual"]).catch("cash"),
  alertOffsets: z
    .array(z.coerce.number().int().min(0).max(maxAlertOffsetDays))
    .max(maxAlertOffsets)
    .transform((values) => [...new Set(values)].sort((left, right) => left - right)),
  fullName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(32).optional().or(z.literal("")),
  taxId: z.string().trim().max(24).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(64).catch(defaultTimezone),
  tradeName: z.string().trim().min(2).max(160).optional().or(z.literal("")),
  workspaceName: z.string().trim().min(2).max(120),
});

const fieldMessages: Record<string, string> = {
  acceptedLegalDocumentIds: "Aceite os documentos para continuar.",
  alertOffsets: "Escolha antecedências entre 0 e 365 dias.",
  fullName: "Informe seu nome completo.",
  legalName: "A razão social precisa de pelo menos 2 caracteres.",
  phone: "Informe o telefone com DDD.",
  taxId: "Informe um CPF ou CNPJ com 11 ou 14 dígitos.",
  tradeName: "O nome fantasia precisa de pelo menos 2 caracteres.",
  workspaceName: "Informe o nome da empresa.",
};

function strings(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

export async function bootstrapAccount(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse({
    acceptedLegalDocumentIds: strings(formData, "legalDocumentIds"),
    accountingBasis: formData.get("accountingBasis"),
    alertOffsets: strings(formData, "alertOffsets"),
    fullName: formData.get("fullName"),
    legalName: formData.get("legalName") ?? "",
    phone: formData.get("phone") ?? "",
    taxId: formData.get("taxId") ?? "",
    timezone: formData.get("timezone"),
    tradeName: formData.get("tradeName") ?? "",
    workspaceName: formData.get("workspaceName"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      fieldErrors[field] ??= fieldMessages[field] ?? "Revise este campo.";
    }
    return rejectSubmission(
      formData,
      "Revise os campos destacados e confirme os documentos legais.",
      fieldErrors,
    );
  }

  const normalizedTaxId = (parsed.data.taxId ?? "").replace(/\D/g, "");
  if (normalizedTaxId && ![11, 14].includes(normalizedTaxId.length)) {
    return rejectSubmission(formData, fieldMessages.taxId, { taxId: fieldMessages.taxId });
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return actionError("Sua sessão expirou. Entre novamente para concluir o cadastro.");
  }

  const now = new Date().toISOString();
  const { data: requiredDocuments, error: documentsError } = await supabase
    .from("legal_documents")
    .select("id")
    .eq("status", "published")
    .eq("is_required", true)
    .lte("effective_at", now);

  const requiredIds = requiredDocuments?.map(({ id }) => id).sort() ?? [];
  const acceptedIds = [...parsed.data.acceptedLegalDocumentIds].sort();

  if (
    documentsError ||
    requiredIds.length === 0 ||
    requiredIds.length !== acceptedIds.length ||
    requiredIds.some((id, index) => id !== acceptedIds[index])
  ) {
    return rejectSubmission(
      formData,
      "Os documentos legais foram atualizados. Recarregue a página e revise as versões.",
    );
  }

  const { error } = await supabase.rpc("bootstrap_identity_workspace", {
    p_accepted_legal_document_ids: acceptedIds,
    p_accounting_basis: parsed.data.accountingBasis,
    p_currency: "BRL",
    p_date_format: "DD/MM/YYYY",
    // Desmarcar todas as antecedências não pode travar o cadastro: vale o padrão.
    p_default_alert_offsets: parsed.data.alertOffsets.length
      ? parsed.data.alertOffsets
      : fallbackAlertOffsets,
    p_full_name: parsed.data.fullName,
    p_legal_name: parsed.data.legalName || parsed.data.workspaceName,
    p_locale: "pt-BR",
    p_phone: parsed.data.phone || undefined,
    p_tax_id: normalizedTaxId || undefined,
    p_theme: "light",
    p_timezone: parsed.data.timezone,
    p_trade_name: parsed.data.tradeName || undefined,
    p_workspace_name: parsed.data.workspaceName,
  });

  if (error) {
    return rejectSubmission(
      formData,
      "Não foi possível concluir o cadastro. Revise os dados e tente novamente.",
    );
  }

  redirect("/dashboard");
}
