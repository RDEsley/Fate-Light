"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  acceptedLegalDocumentIds: z.array(z.string().uuid()).min(1),
  accountingBasis: z.enum(["cash", "accrual"]),
  alertOffsets: z
    .array(z.coerce.number().int().min(0).max(365))
    .min(1)
    .transform((values) => [...new Set(values)]),
  currency: z.literal("BRL"),
  dateFormat: z.enum(["DD/MM/YYYY", "YYYY-MM-DD"]),
  fullName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(160).optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(32).optional().or(z.literal("")),
  taxId: z.string().trim().max(24).optional().or(z.literal("")),
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string().trim().min(1).max(64),
  tradeName: z.string().trim().min(2).max(160).optional().or(z.literal("")),
  workspaceName: z.string().trim().min(2).max(120),
});

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
    currency: formData.get("currency"),
    dateFormat: formData.get("dateFormat"),
    fullName: formData.get("fullName"),
    legalName: formData.get("legalName"),
    phone: formData.get("phone"),
    taxId: formData.get("taxId"),
    theme: formData.get("theme"),
    timezone: formData.get("timezone"),
    tradeName: formData.get("tradeName"),
    workspaceName: formData.get("workspaceName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revise os campos obrigatórios e confirme todos os documentos legais atuais.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "Sua sessão expirou. Solicite um novo link de acesso." };
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
    return {
      status: "error",
      message: "Os documentos legais foram atualizados. Recarregue a página e revise as versões.",
    };
  }

  const normalizedTaxId = (parsed.data.taxId ?? "").replace(/\D/g, "");
  if (normalizedTaxId && ![11, 14].includes(normalizedTaxId.length)) {
    return { status: "error", message: "Informe um CPF ou CNPJ com 11 ou 14 dígitos." };
  }

  const { error } = await supabase.rpc("bootstrap_identity_workspace", {
    p_accepted_legal_document_ids: acceptedIds,
    p_accounting_basis: parsed.data.accountingBasis,
    p_currency: parsed.data.currency,
    p_date_format: parsed.data.dateFormat,
    p_default_alert_offsets: parsed.data.alertOffsets,
    p_full_name: parsed.data.fullName,
    p_legal_name: parsed.data.legalName || parsed.data.workspaceName,
    p_locale: "pt-BR",
    p_phone: parsed.data.phone || undefined,
    p_tax_id: normalizedTaxId || undefined,
    p_theme: parsed.data.theme,
    p_timezone: parsed.data.timezone,
    p_trade_name: parsed.data.tradeName || undefined,
    p_workspace_name: parsed.data.workspaceName,
  });

  if (error) {
    return {
      status: "error",
      message: "Não foi possível criar o workspace. Revise os dados e tente novamente.",
    };
  }

  redirect("/dashboard");
}
