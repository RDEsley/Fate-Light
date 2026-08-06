"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { rejectSubmission, type ActionState } from "@/lib/forms/action-state";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const optionalText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).optional().or(z.literal(""));

const workspaceSchema = z.object({
  accountingBasis: z.enum(["cash", "accrual"]),
  addressCity: optionalText(2, 100),
  addressDistrict: optionalText(2, 100),
  addressLine1: optionalText(2, 160),
  addressLine2: optionalText(1, 160),
  addressRegion: optionalText(2, 100),
  alertOffsets: z
    .array(z.coerce.number().int().min(0).max(365))
    .min(1)
    .transform((values) => [...new Set(values)]),
  countryCode: z.literal("BR"),
  dateFormat: z.literal("DD/MM/YYYY"),
  legalName: z.string().trim().min(2).max(160),
  postalCode: optionalText(3, 20),
  taxId: z.string().trim().max(24).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(64),
  tradeName: optionalText(2, 160),
  workspaceName: z.string().trim().min(2).max(120),
});

function strings(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

export async function updateWorkspaceConfiguration(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = workspaceSchema.safeParse({
    accountingBasis: formData.get("accountingBasis"),
    addressCity: formData.get("addressCity"),
    addressDistrict: formData.get("addressDistrict"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    addressRegion: formData.get("addressRegion"),
    alertOffsets: strings(formData, "alertOffsets"),
    countryCode: formData.get("countryCode"),
    dateFormat: formData.get("dateFormat"),
    legalName: formData.get("legalName"),
    postalCode: formData.get("postalCode"),
    taxId: formData.get("taxId"),
    timezone: formData.get("timezone"),
    tradeName: formData.get("tradeName"),
    workspaceName: formData.get("workspaceName"),
  });

  if (!parsed.success) {
    return rejectSubmission(formData, "Revise os dados e preferências da empresa.");
  }

  const normalizedTaxId = (parsed.data.taxId ?? "").replace(/\D/g, "");
  if (normalizedTaxId && ![11, 14].includes(normalizedTaxId.length)) {
    return rejectSubmission(formData, "Informe um CPF ou CNPJ com 11 ou 14 dígitos.", {
      taxId: "Informe 11 dígitos para CPF ou 14 para CNPJ.",
    });
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return { status: "error", message: "Sua sessão expirou. Entre novamente." };
  }

  const { error } = await supabase.rpc("update_current_workspace_configuration", {
    p_accounting_basis: parsed.data.accountingBasis,
    p_address_city: parsed.data.addressCity ?? "",
    p_address_district: parsed.data.addressDistrict ?? "",
    p_address_line1: parsed.data.addressLine1 ?? "",
    p_address_line2: parsed.data.addressLine2 ?? "",
    p_address_region: parsed.data.addressRegion ?? "",
    p_country_code: parsed.data.countryCode,
    p_date_format: parsed.data.dateFormat,
    p_default_alert_offsets: parsed.data.alertOffsets,
    p_legal_name: parsed.data.legalName,
    p_postal_code: parsed.data.postalCode ?? "",
    p_tax_id: normalizedTaxId,
    p_timezone: parsed.data.timezone,
    p_trade_name: parsed.data.tradeName ?? "",
    p_workspace_name: parsed.data.workspaceName,
  });

  if (error) {
    return rejectSubmission(formData, "Não foi possível atualizar a empresa.");
  }

  revalidatePath("/configuracoes/empresa");
  return { status: "success", message: "Configurações da empresa atualizadas." };
}

export async function resetWorkspaceOperationalData(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const confirmation = z.literal("EXCLUIR TUDO").safeParse(formData.get("confirmation"));
  if (!confirmation.success) {
    return { status: "error", message: "Digite EXCLUIR TUDO para confirmar a limpeza." };
  }
  const { supabase } = await requireWorkspaceContext();
  const { error } = await supabase.rpc("reset_current_workspace_operational_data", {
    p_confirmation: confirmation.data,
  });
  if (error) {
    return { status: "error", message: "Não foi possível excluir os dados operacionais." };
  }
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: "Dados operacionais excluídos. Sua conta e configurações foram preservadas.",
  };
}
