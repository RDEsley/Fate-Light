import { z } from "zod";

const publicEnvironmentShape = {
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(16),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
} satisfies z.ZodRawShape;

const optionalSecretKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(16).optional(),
);

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).max(80).optional(),
);

const optionalFlag = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value === "true"),
  z.boolean().optional(),
);

function requireProductionTurnstile<T extends { NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string }>(
  value: T,
  context: z.RefinementCtx,
) {
  if (process.env.NODE_ENV === "production" && !value.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    context.addIssue({
      code: "custom",
      message: "Turnstile é obrigatório em produção.",
      path: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
    });
  }
}

export const publicEnvironmentSchema = z
  .strictObject(publicEnvironmentShape)
  .superRefine(requireProductionTurnstile);

export const serverEnvironmentSchema = z
  .strictObject({
    ...publicEnvironmentShape,
    SUPABASE_SECRET_KEY: optionalSecretKey,
    // Lembretes pelo WhatsApp (ADR-0024). Sem eles, as rotas respondem 503 e nada é enviado.
    CRON_SECRET: optionalSecretKey,
    WHATSAPP_APP_SECRET: optionalSecretKey,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: optionalSecretKey,
    // Assistente com IA (ADR-0026). Sem chave, o painel explica que está indisponível.
    GOOGLE_GENERATIVE_AI_API_KEY: optionalSecretKey,
    GROQ_API_KEY: optionalSecretKey,
    AGENT_MODEL: optionalText,
    AGENT_FALLBACK_MODEL: optionalText,
    AGENT_APPROVAL_SECRET: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(32).optional(),
    ),
    AGENT_IP_HASH_SALT: optionalSecretKey,
    AGENT_GUEST_DAILY_CAP: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().min(1).max(10_000).optional(),
    ),
    AGENT_REAL_DATA_ENABLED: optionalFlag,
    // Modelo roteirizado dos testes E2E; o código o recusa em produção.
    AGENT_SCRIPTED_MODEL: optionalFlag,
  })
  .superRefine(requireProductionTurnstile);

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

function formatEnvironmentError(error: z.ZodError): string {
  const invalidKeys = [...new Set(error.issues.map((issue) => issue.path.join(".")))];
  return invalidKeys.join(", ");
}

export function parsePublicEnvironment(input: unknown): PublicEnvironment {
  const result = publicEnvironmentSchema.safeParse(input);

  if (!result.success) {
    throw new Error(`Configuração pública inválida: ${formatEnvironmentError(result.error)}`);
  }

  return result.data;
}

export function parseServerEnvironment(input: unknown): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(input);

  if (!result.success) {
    throw new Error(`Configuração de servidor inválida: ${formatEnvironmentError(result.error)}`);
  }

  return result.data;
}
