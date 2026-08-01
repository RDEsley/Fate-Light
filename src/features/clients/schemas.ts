import { z } from "zod";

const clientFormSchema = z
  .object({
    companyName: z.string().trim().max(160),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
    name: z.string().trim().min(2).max(160),
    notes: z.string().trim().max(5000),
    phone: z.string().trim().max(32),
    status: z.enum(["active", "inactive"]),
  })
  .refine((value) => !value.companyName || value.companyName.length >= 2, { path: ["companyName"] })
  .refine((value) => !value.phone || value.phone.length >= 7, { path: ["phone"] });

function optional(value: string) {
  return value || null;
}

export function parseClientForm(formData: FormData) {
  const parsed = clientFormSchema.safeParse({
    companyName: formData.get("companyName"),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    name: formData.get("name"),
    notes: formData.get("notes"),
    phone: formData.get("phone"),
    status: formData.get("status"),
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
  };
}
