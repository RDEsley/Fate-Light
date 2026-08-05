import { z } from "zod";

import { clientStatusValues } from "./status";

/** Aceita o endereço colado com protocolo e guarda apenas o host em minúsculas. */
const websiteSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^https?:\/\//, "").split("/")[0] ?? "")
    .pipe(z.string().regex(/^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$/)),
]);

const clientFormSchema = z
  .object({
    companyName: z.string().trim().max(160),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
    name: z.string().trim().min(2).max(160),
    notes: z.string().trim().max(5000),
    phone: z.string().trim().max(32),
    status: z.enum(clientStatusValues),
    website: websiteSchema,
  })
  .refine((value) => !value.companyName || value.companyName.length >= 2, { path: ["companyName"] })
  .refine((value) => !value.phone || value.phone.length >= 7, { path: ["phone"] });

function optional(value: string) {
  return value || null;
}

export function parseClientForm(formData: FormData) {
  // Campos opcionais ausentes valem como vazios: nem todo formulário envia todos eles.
  const text = (field: string) => String(formData.get(field) ?? "");
  const parsed = clientFormSchema.safeParse({
    companyName: text("companyName"),
    email: text("email").trim().toLowerCase(),
    name: formData.get("name"),
    notes: text("notes"),
    phone: text("phone"),
    status: formData.get("status"),
    website: text("website"),
  });

  if (!parsed.success) return null;
  return {
    address_json: null,
    commercial_status: parsed.data.status,
    email: optional(parsed.data.email),
    kind: "company",
    name: parsed.data.name,
    notes: optional(parsed.data.notes),
    phone: optional(parsed.data.phone),
    responsible_name: null,
    tags: [],
    tax_id: null,
    trade_name: optional(parsed.data.companyName),
    website: optional(parsed.data.website),
  };
}

/**
 * Valor que o cliente já pagou antes do sistema existir. Vira uma única cobrança
 * quitada para que a receita continue sendo sempre a soma das cobranças.
 */
export const priorRevenueSchema = z.object({
  priorRevenue: z.coerce.number().finite().min(0.01).max(9_999_999_999_999.99),
  priorRevenueDate: z.string().date(),
});

export function parsePriorRevenue(formData: FormData) {
  const raw = String(formData.get("priorRevenue") ?? "").trim();
  if (!raw) return null;
  const parsed = priorRevenueSchema.safeParse({
    priorRevenue: raw,
    priorRevenueDate: formData.get("priorRevenueDate"),
  });
  return parsed.success ? parsed.data : null;
}
