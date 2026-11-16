import { z } from "zod";

import { normalizeWhatsAppPhone } from "./phone";

const optionalTemplate = z
  .string()
  .trim()
  .max(512)
  .regex(/^[a-z0-9_]*$/)
  .transform((value) => value || null);

export const whatsappSettingsSchema = z
  .object({
    accessToken: z.string().trim().max(1024),
    daysAfter: z.coerce.number().int().min(0).max(30),
    daysBefore: z.coerce.number().int().min(0).max(15),
    enabled: z.boolean(),
    headerImageUrl: z
      .string()
      .trim()
      .max(1000)
      .refine((value) => !value || /^https:\/\/\S+$/.test(value))
      .transform((value) => value || null),
    phoneNumberId: z
      .string()
      .trim()
      .regex(/^\d{0,32}$/)
      .transform((value) => value || null),
    pixKey: z
      .string()
      .trim()
      .max(140)
      .refine((value) => !value || value.length >= 3)
      .transform((value) => value || null),
    removeToken: z.boolean(),
    templateBefore: optionalTemplate,
    templateDue: optionalTemplate,
    templateLanguage: z
      .string()
      .trim()
      .regex(/^[a-z]{2}(_[A-Z]{2})?$/),
    templateOverdue: optionalTemplate,
  })
  .refine((value) => !value.accessToken || value.accessToken.length >= 20, {
    path: ["accessToken"],
  })
  .refine((value) => !value.phoneNumberId || value.phoneNumberId.length >= 5, {
    path: ["phoneNumberId"],
  });

export type WhatsAppSettingsInput = z.infer<typeof whatsappSettingsSchema>;

export const whatsappSettingsFieldMessages: Record<string, string> = {
  accessToken: "Cole o token de acesso completo gerado na Meta.",
  daysAfter: "Use de 0 a 30 dias.",
  daysBefore: "Use de 0 a 15 dias.",
  headerImageUrl: "Use um endereço https:// da imagem.",
  phoneNumberId: "Informe o ID do número (só dígitos), não o telefone.",
  pixKey: "Informe a chave PIX com pelo menos 3 caracteres.",
  templateBefore: "Use o nome do template: letras minúsculas, números e _.",
  templateDue: "Use o nome do template: letras minúsculas, números e _.",
  templateLanguage: "Use o código do idioma, como pt_BR.",
  templateOverdue: "Use o nome do template: letras minúsculas, números e _.",
};

export function parseWhatsAppSettingsForm(formData: FormData) {
  const text = (field: string) => String(formData.get(field) ?? "");
  return whatsappSettingsSchema.safeParse({
    accessToken: text("accessToken"),
    daysAfter: text("daysAfter") || "0",
    daysBefore: text("daysBefore") || "0",
    enabled: formData.get("enabled") === "on",
    headerImageUrl: text("headerImageUrl"),
    phoneNumberId: text("phoneNumberId"),
    pixKey: text("pixKey"),
    removeToken: formData.get("removeToken") === "on",
    templateBefore: text("templateBefore"),
    templateDue: text("templateDue"),
    templateLanguage: text("templateLanguage") || "pt_BR",
    templateOverdue: text("templateOverdue"),
  });
}

const clientPreferenceSchema = z.object({
  contactName: z
    .string()
    .trim()
    .max(80)
    .refine((value) => !value || value.length >= 2)
    .transform((value) => value || null),
  enabled: z.boolean(),
  phone: z.string().trim().max(32),
});

/** Telefone opcional: vazio usa o do cadastro; preenchido precisa virar número válido. */
export function parseClientWhatsAppForm(formData: FormData) {
  const parsed = clientPreferenceSchema.safeParse({
    contactName: String(formData.get("contactName") ?? ""),
    enabled: formData.get("enabled") === "on",
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return {
      field: String(parsed.error.issues[0]?.path[0] ?? "contactName"),
      success: false as const,
    };
  }
  const phone = parsed.data.phone ? normalizeWhatsAppPhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { field: "phone", success: false as const };
  return {
    data: { contactName: parsed.data.contactName, enabled: parsed.data.enabled, phone },
    success: true as const,
  };
}
