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

/** Diferente do site principal, um link extra preserva o caminho depois da barra. */
const linkUrlSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^https?:\/\//, "").replace(/\/+$/, ""))
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?(\/\S*)?$/)
      .max(253),
  );

export const maxClientLinks = 3;

export type ClientLink = { label: string; url: string };

/**
 * Links extras chegam como pares `linkLabel`/`linkUrl` repetidos. Uma linha só conta
 * quando tem rótulo e endereço: preencher metade é engano, não intenção.
 */
export function parseClientLinks(formData: FormData): ClientLink[] {
  const labels = formData.getAll("linkLabel").map((value) => String(value).trim());
  const urls = formData.getAll("linkUrl").map((value) => String(value).trim());
  const links: ClientLink[] = [];

  for (let index = 0; index < Math.max(labels.length, urls.length); index += 1) {
    const label = (labels[index] ?? "").slice(0, 40);
    const parsedUrl = linkUrlSchema.safeParse(urls[index] ?? "");
    if (!label || !parsedUrl.success) continue;
    links.push({ label, url: parsedUrl.data });
    if (links.length === maxClientLinks) break;
  }

  return links;
}

/** Lê os links vindos do banco descartando o que não couber no formato esperado. */
export function readClientLinks(value: unknown): ClientLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is ClientLink =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ClientLink).label === "string" &&
        typeof (entry as ClientLink).url === "string",
    )
    .slice(0, maxClientLinks);
}

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

/**
 * Devolve o resultado do schema em vez de `null` no erro: sem o `ZodError` a action não
 * tem como dizer qual campo recusou, e o formulário voltava com um aviso genérico.
 */
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

  if (!parsed.success) return { error: parsed.error, success: false as const };
  return {
    data: {
      address_json: null,
      commercial_status: parsed.data.status,
      email: optional(parsed.data.email),
      kind: "company",
      links: parseClientLinks(formData),
      name: parsed.data.name,
      notes: optional(parsed.data.notes),
      phone: optional(parsed.data.phone),
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: optional(parsed.data.companyName),
      website: optional(parsed.data.website),
    },
    success: true as const,
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
