import {
  parsePublicEnvironment,
  parseServerEnvironment,
  publicEnvironmentSchema,
} from "@/config/env/schema";

const validPublicEnvironment = {
  NEXT_PUBLIC_APP_URL: "https://example.invalid",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_placeholder",
};

describe("environment validation", () => {
  it("aceita uma configuração pública válida", () => {
    expect(parsePublicEnvironment(validPublicEnvironment)).toEqual(validPublicEnvironment);
  });

  it("normaliza CAPTCHA vazio e aceita uma site key pública", () => {
    expect(
      parsePublicEnvironment({
        ...validPublicEnvironment,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      }),
    ).toEqual(validPublicEnvironment);
    expect(
      parsePublicEnvironment({
        ...validPublicEnvironment,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
      }),
    ).toMatchObject({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key" });
  });

  it("falha cedo e informa somente a chave pública inválida", () => {
    expect(() =>
      parsePublicEnvironment({
        ...validPublicEnvironment,
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      }),
    ).toThrow("Configuração pública inválida: NEXT_PUBLIC_SUPABASE_URL");
  });

  it("rejeita uma chave de servidor no contrato público", () => {
    const result = publicEnvironmentSchema.safeParse({
      ...validPublicEnvironment,
      SUPABASE_SECRET_KEY: "server_test_value_for_boundary",
    });

    expect(result.success).toBe(false);
  });

  it("mantém a chave secreta opcional enquanto nenhum cliente privilegiado existe", () => {
    expect(parseServerEnvironment(validPublicEnvironment)).toEqual(validPublicEnvironment);
    expect(
      parseServerEnvironment({
        ...validPublicEnvironment,
        SUPABASE_SECRET_KEY: "",
      }),
    ).toEqual(validPublicEnvironment);
    expect(
      parseServerEnvironment({
        ...validPublicEnvironment,
        SUPABASE_SECRET_KEY: "server_test_placeholder_value",
      }),
    ).toMatchObject({
      SUPABASE_SECRET_KEY: "server_test_placeholder_value",
    });
  });

  it("rejeita valores de servidor inválidos sem expor o valor", () => {
    expect(() =>
      parseServerEnvironment({
        ...validPublicEnvironment,
        SUPABASE_SECRET_KEY: "short",
      }),
    ).toThrow("Configuração de servidor inválida: SUPABASE_SECRET_KEY");
  });
});
