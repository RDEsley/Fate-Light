import { vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: authMocks.redirect }));
vi.mock("@/lib/auth/account-gate", () => ({
  getAccountDestination: vi.fn(async (_client: unknown, path: string) => ({
    kind: "active",
    path,
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
    },
  })),
}));

import { authenticateWithPassword } from "@/app/(auth)/actions";

function passwordForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    confirmPassword: "Senha-segura-2026!",
    email: "pessoa@example.test",
    mode: "login",
    next: "/dashboard",
    password: "Senha-segura-2026!",
    website: "",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("password authentication action", () => {
  beforeEach(() => {
    authMocks.redirect.mockClear();
    authMocks.signInWithPassword.mockReset();
    authMocks.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    authMocks.signUp.mockReset();
    authMocks.signUp.mockResolvedValue({ data: { session: {} }, error: null });
  });

  it("entra com e-mail e senha e preserva o destino seguro", async () => {
    await expect(authenticateWithPassword(passwordForm({ next: "/clientes" }))).rejects.toThrow(
      "REDIRECT:/clientes",
    );

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "pessoa@example.test",
      options: { captchaToken: undefined },
      password: "Senha-segura-2026!",
    });
  });

  it("não expõe detalhes quando as credenciais são recusadas", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error("invalid credentials"),
    });

    await expect(authenticateWithPassword(passwordForm())).rejects.toThrow(
      "REDIRECT:/login?status=invalid-credentials",
    );
  });

  it("cria conta com senha e segue para o onboarding quando há sessão", async () => {
    await expect(
      authenticateWithPassword(passwordForm({ mode: "signup", next: "/onboarding" })),
    ).rejects.toThrow("REDIRECT:/onboarding");

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "pessoa@example.test",
      options: {
        captchaToken: undefined,
        emailRedirectTo: "https://example.invalid/auth/confirm?next=%2Fonboarding",
      },
      password: "Senha-segura-2026!",
    });
  });

  it("solicita confirmação quando o cadastro não retorna sessão", async () => {
    authMocks.signUp.mockResolvedValue({ data: { session: null }, error: null });

    await expect(authenticateWithPassword(passwordForm({ mode: "signup" }))).rejects.toThrow(
      "REDIRECT:/cadastro?status=confirmation-sent",
    );
  });

  it("rejeita confirmação de senha divergente antes do provedor", async () => {
    await expect(
      authenticateWithPassword(
        passwordForm({ confirmPassword: "Outra-senha-2026!", mode: "signup" }),
      ),
    ).rejects.toThrow("REDIRECT:/cadastro?status=invalid");
    expect(authMocks.signUp).not.toHaveBeenCalled();
  });

  it("descarta o honeypot sem tentar autenticar", async () => {
    await expect(
      authenticateWithPassword(passwordForm({ website: "bot.example" })),
    ).rejects.toThrow("REDIRECT:/login?status=invalid-credentials");
    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
  });
});
