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

export const publicEnvironmentSchema = z.strictObject(publicEnvironmentShape);

export const serverEnvironmentSchema = z.strictObject({
  ...publicEnvironmentShape,
  SUPABASE_SECRET_KEY: optionalSecretKey,
});

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
