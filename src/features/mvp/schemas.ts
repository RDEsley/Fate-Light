import { z } from "zod";

import { billingFrequencyValues } from "./recurrence";

const money = z.coerce.number().finite().min(0).max(9_999_999_999_999.99);
const optionalText = (maximum: number) => z.string().trim().max(maximum);
const optionalMoney = z.union([z.literal(""), money]);
const nullableMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  money.nullable(),
);
const nullableInteger = (maximum: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().int().min(1).max(maximum).nullable(),
  );

export const identifierSchema = z.string().uuid();

/**
 * Natureza do custo adicional (ADR-0018). Ausente ou vazio vale como receita própria:
 * é o default da coluna e o comportamento que o dashboard já praticava.
 */
const additionalFeeNature = z
  .union([z.literal(""), z.enum(["revenue", "passthrough"])])
  .default("")
  .transform((value) => value !== "passthrough");

export const clientServiceSchema = z
  .object({
    additionalFee: money,
    additionalFeeIsRevenue: additionalFeeNature,
    adjustmentIntervalMonths: nullableInteger(60),
    adjustmentRate: nullableMoney,
    billingType: z.enum(billingFrequencyValues),
    description: optionalText(3000),
    discountType: z.enum(["none", "percentage", "fixed"]),
    discountValue: money,
    installmentCount: z.coerce.number().int().min(1).max(120),
    listPrice: money,
    mediaBudget: money,
    name: z.string().trim().min(2).max(120),
    nextDueDate: z.string().date(),
    notes: optionalText(5000),
    promotionalCycles: nullableInteger(60),
    promotionalPrice: nullableMoney,
    serviceId: z.union([z.literal(""), identifierSchema]),
    startDate: z.string().date(),
  })
  .refine((value) => value.nextDueDate >= value.startDate, { path: ["nextDueDate"] })
  .refine(
    (value) =>
      (value.discountType === "none" && value.discountValue === 0) ||
      (value.discountType === "percentage" && value.discountValue <= 100) ||
      (value.discountType === "fixed" && value.discountValue <= value.listPrice),
    { path: ["discountValue"] },
  )
  .refine(
    (value) =>
      (value.promotionalPrice === null && value.promotionalCycles === null) ||
      (value.promotionalPrice !== null && value.promotionalCycles !== null),
    { path: ["promotionalPrice"] },
  )
  .refine(
    (value) =>
      (value.adjustmentIntervalMonths === null && value.adjustmentRate === null) ||
      (value.adjustmentIntervalMonths !== null &&
        value.adjustmentRate !== null &&
        value.adjustmentRate <= 100),
    { path: ["adjustmentIntervalMonths"] },
  );

export const serviceCatalogSchema = z
  .object({
    adjustmentIntervalMonths: nullableInteger(60),
    adjustmentRate: nullableMoney,
    billingType: z.enum(billingFrequencyValues),
    defaultPrice: money,
    description: optionalText(3000),
    name: z.string().trim().min(2).max(120),
  })
  .refine(
    (value) =>
      (value.adjustmentIntervalMonths === null && value.adjustmentRate === null) ||
      (value.adjustmentIntervalMonths !== null &&
        value.adjustmentRate !== null &&
        value.adjustmentRate <= 100),
    { path: ["adjustmentIntervalMonths"] },
  );

/**
 * Receita própria de uma cobrança. O custo adicional só entra quando declarado como
 * receita (ADR-0018); como repasse ele acompanha a verba de mídia e nunca compõe
 * faturamento, resultado ou margem — a mesma separação da ADR-0001.
 */
export function ownRevenue(charge: {
  additional_fee: number | string | null;
  additional_fee_is_revenue?: boolean | null;
  company_revenue: number | string | null;
}) {
  const additional =
    charge.additional_fee_is_revenue === false ? 0 : Number(charge.additional_fee ?? 0);
  return Number(charge.company_revenue ?? 0) + additional;
}

export function discountedPrice(
  listPrice: number,
  discountType: "fixed" | "none" | "percentage",
  discountValue: number,
) {
  const result =
    discountType === "percentage"
      ? listPrice * (1 - discountValue / 100)
      : discountType === "fixed"
        ? listPrice - discountValue
        : listPrice;
  return Math.round(Math.max(0, result) * 100) / 100;
}

export const chargeSchema = z
  .object({
    additionalFee: money,
    additionalFeeIsRevenue: additionalFeeNature,
    alreadyPaid: z.boolean(),
    clientId: identifierSchema,
    clientServiceId: z.union([z.literal(""), identifierSchema]),
    companyRevenue: money,
    description: z.string().trim().min(2).max(200),
    dueDate: z.string().date(),
    mediaBudget: money,
    notes: optionalText(5000),
    paymentMethod: optionalText(80),
  })
  .refine((value) => value.companyRevenue + value.mediaBudget + value.additionalFee > 0, {
    path: ["companyRevenue"],
  })
  .refine((value) => !value.alreadyPaid || value.paymentMethod.length >= 2, {
    path: ["paymentMethod"],
  });

export const expenseSchema = z.object({
  amount: money.refine((value) => value > 0),
  category: z.enum([
    "tools",
    "artificial_intelligence",
    "agents",
    "staff_contractors",
    "domains",
    "hosting",
    "software",
    "marketing",
    "other",
  ]),
  clientId: z.union([z.literal(""), identifierSchema]),
  description: z.string().trim().min(2).max(200),
  dueDate: z.string().date(),
  expenseType: z.enum(["fixed", "variable"]),
  notes: optionalText(5000),
  status: z.enum(["pending", "paid"]),
});

export const domainSchema = z.object({
  autoRenew: z.boolean(),
  clientId: identifierSchema,
  cost: optionalMoney,
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^https?:\/\//, "").split("/")[0] ?? "")
    .pipe(z.string().regex(/^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$/)),
  expiresOn: z.string().date(),
  notes: optionalText(5000),
  paymentResponsibility: z.string().trim().min(2).max(120),
  // Aceita tanto o nome do registrador ("GoDaddy") quanto o link do site; se vier com
  // protocolo, limpamos para poder detectar e linkar automaticamente na exibição.
  registrar: z
    .string()
    .trim()
    .transform((value) => value.replace(/^https?:\/\//i, "").replace(/\/+$/, ""))
    .pipe(z.string().max(120)),
});

export const paymentSchema = z.object({
  id: identifierSchema,
  paymentMethod: z.string().trim().min(2).max(80),
});

export const delayReasonSchema = z
  .object({
    code: z.enum([
      "client_requested",
      "invoice_issue",
      "payment_rescheduled",
      "commercial_negotiation",
      "internal_follow_up",
      "other",
    ]),
    id: identifierSchema,
    reason: z.string().trim().min(2).max(500),
  })
  .refine((value) => value.code !== "other" || value.reason.length >= 4, {
    path: ["reason"],
  });

export const cancellationReasons = [
  ["client_withdrew", "Cliente desistiu"],
  ["service_not_delivered", "Serviço não foi executado"],
  ["duplicate_charge", "Cobrança duplicada"],
  ["entry_error", "Erro de lançamento"],
  ["renegotiated", "Renegociado em outra cobrança"],
  ["other", "Outro motivo"],
] as const;

export const cancellationSchema = z
  .object({
    code: z.enum(cancellationReasons.map(([value]) => value) as [string, ...string[]]),
    id: identifierSchema,
    reason: z.string().trim().min(2).max(500),
  })
  .refine((value) => value.code !== "other" || value.reason.length >= 4, { path: ["reason"] });

export const serviceStateSchema = z.enum(["active", "paused", "ended"]);

export const serviceScheduleSchema = z.object({
  billingType: z.enum(billingFrequencyValues),
  clientId: identifierSchema,
  id: identifierSchema,
  nextDueDate: z.string().date(),
});

export const operationalDeletionSchema = z.object({
  clientId: z.union([z.literal(""), identifierSchema]),
  id: identifierSchema,
  recordType: z.enum(["charge", "domain", "expense", "service"]),
});

export function optional(value: string) {
  return value || null;
}
