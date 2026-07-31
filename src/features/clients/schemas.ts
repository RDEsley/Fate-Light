import { z } from "zod";

const optionalText = (maximum: number) => z.string().trim().max(maximum);
const optionalBoundedText = (minimum: number, maximum: number) =>
  optionalText(maximum).refine((value) => !value || value.length >= minimum);

const clientFormSchema = z.object({
  addressCity: optionalBoundedText(2, 100),
  addressCountryCode: optionalBoundedText(2, 2),
  addressDistrict: optionalBoundedText(2, 100),
  addressLine1: optionalBoundedText(2, 160),
  addressLine2: optionalText(160),
  addressPostalCode: optionalBoundedText(3, 20),
  addressRegion: optionalBoundedText(2, 100),
  commercialStatus: z.enum(["lead", "active", "paused", "inactive"]),
  kind: z.enum(["person", "company"]),
  name: z.string().trim().min(2).max(160),
  notes: optionalText(5000),
  responsibleName: optionalBoundedText(2, 120),
  tags: optionalText(820),
  taxId: optionalText(24),
  tradeName: optionalBoundedText(2, 160),
});

const contactFormSchema = z
  .object({
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
    isPrimary: z.boolean(),
    name: z.string().trim().min(2).max(120),
    phone: optionalBoundedText(7, 32),
    role: optionalBoundedText(2, 80),
  })
  .refine((contact) => Boolean(contact.email || contact.phone), {
    message: "Informe e-mail ou telefone.",
  });

function optional(value: string) {
  return value || null;
}

function addressFrom(values: z.infer<typeof clientFormSchema>) {
  const entries = {
    city: values.addressCity,
    country_code: values.addressCountryCode.toUpperCase(),
    district: values.addressDistrict,
    line1: values.addressLine1,
    line2: values.addressLine2,
    postal_code: values.addressPostalCode,
    region: values.addressRegion.toUpperCase(),
  };
  const address = Object.fromEntries(Object.entries(entries).filter(([, value]) => value));
  return Object.keys(address).length ? address : null;
}

export function parseClientForm(formData: FormData) {
  const parsed = clientFormSchema.safeParse({
    addressCity: formData.get("addressCity"),
    addressCountryCode: formData.get("addressCountryCode"),
    addressDistrict: formData.get("addressDistrict"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    addressPostalCode: formData.get("addressPostalCode"),
    addressRegion: formData.get("addressRegion"),
    commercialStatus: formData.get("commercialStatus"),
    kind: formData.get("kind"),
    name: formData.get("name"),
    notes: formData.get("notes"),
    responsibleName: formData.get("responsibleName"),
    tags: formData.get("tags"),
    taxId: formData.get("taxId"),
    tradeName: formData.get("tradeName"),
  });

  if (!parsed.success) return null;

  const taxId = parsed.data.taxId.replace(/\D/g, "");
  if (taxId && taxId.length !== 11 && taxId.length !== 14) return null;

  const tags = [
    ...new Set(
      parsed.data.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (tags.length > 20 || tags.some((tag) => tag.length > 40)) return null;

  return {
    address_json: addressFrom(parsed.data),
    commercial_status: parsed.data.commercialStatus,
    kind: parsed.data.kind,
    name: parsed.data.name,
    notes: optional(parsed.data.notes),
    responsible_name: optional(parsed.data.responsibleName),
    tags,
    tax_id: taxId || null,
    trade_name: optional(parsed.data.tradeName),
  };
}

export function parseContactForm(formData: FormData) {
  const parsed = contactFormSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    isPrimary: formData.get("isPrimary") === "on",
    name: formData.get("name"),
    phone: formData.get("phone"),
    role: formData.get("role"),
  });

  if (!parsed.success) return null;

  return {
    email: optional(parsed.data.email),
    is_primary: parsed.data.isPrimary,
    name: parsed.data.name,
    phone: optional(parsed.data.phone),
    role: optional(parsed.data.role),
  };
}
