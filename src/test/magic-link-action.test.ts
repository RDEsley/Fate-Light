import { vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getClaims: vi.fn(),
  signOut: vi.fn(),
  signInWithOtp: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: authMocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getClaims: authMocks.getClaims,
      signInWithOtp: authMocks.signInWithOtp,
      signOut: authMocks.signOut,
    },
  })),
}));

import { requestMagicLink, signOut } from "@/app/(auth)/actions";

function magicLinkForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    email: "pessoa@example.test",
    mode: "login",
    next: "/perfil",
    website: "",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("magic link action", () => {
  beforeEach(() => {
    authMocks.redirect.mockClear();
    authMocks.getClaims.mockReset();
    authMocks.getClaims.mockResolvedValue({ data: { claims: { sub: "user-id" } } });
    authMocks.signOut.mockReset();
    authMocks.signOut.mockResolvedValue({ error: null });
    authMocks.signInWithOtp.mockReset();
    authMocks.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  });

  it("não cria conta durante o fluxo de login", async () => {
    await expect(requestMagicLink(magicLinkForm())).rejects.toThrow("REDIRECT:/login?status=sent");

    expect(authMocks.signInWithOtp).toHaveBeenCalledWith({
      email: "pessoa@example.test",
      options: expect.objectContaining({
        emailRedirectTo: "https://example.invalid/auth/confirm?next=%2Fperfil",
        shouldCreateUser: false,
      }),
    });
  });

  it("permite criação somente no cadastro explícito", async () => {
    await expect(
      requestMagicLink(magicLinkForm({ mode: "signup", next: "/onboarding" })),
    ).rejects.toThrow("REDIRECT:/cadastro?status=sent");

    expect(authMocks.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ shouldCreateUser: true }),
      }),
    );
  });

  it("mantém resposta genérica quando o provedor recusa a solicitação", async () => {
    authMocks.signInWithOtp.mockResolvedValue({
      data: {},
      error: new Error("user not found"),
    });

    await expect(requestMagicLink(magicLinkForm())).rejects.toThrow("REDIRECT:/login?status=sent");
  });

  it("descarta honeypot sem chamar o provedor", async () => {
    await expect(requestMagicLink(magicLinkForm({ website: "bot.example" }))).rejects.toThrow(
      "REDIRECT:/login?status=sent",
    );
    expect(authMocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("rejeita e-mail inválido antes de chamar o provedor", async () => {
    await expect(requestMagicLink(magicLinkForm({ email: "not-an-email" }))).rejects.toThrow(
      "REDIRECT:/login?status=invalid",
    );
    expect(authMocks.signInWithOtp).not.toHaveBeenCalled();
  });

  it("encerra somente uma sessão verificada", async () => {
    await expect(signOut()).rejects.toThrow("REDIRECT:/login?status=signed-out");
    expect(authMocks.signOut).toHaveBeenCalledWith({ scope: "local" });

    authMocks.signOut.mockClear();
    authMocks.getClaims.mockResolvedValue({ data: { claims: {} } });
    await expect(signOut()).rejects.toThrow("REDIRECT:/login?status=signed-out");
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });
});
