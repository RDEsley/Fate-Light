import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/account-gate", () => ({ getAccountDestination: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: mocks })),
}));

import { requestPasswordRecovery, updateRecoveredPassword } from "@/app/(auth)/actions";

describe("password recovery actions", () => {
  beforeEach(() => {
    mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
    mocks.updateUser.mockReset().mockResolvedValue({ error: null });
    mocks.getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "user-id" } } });
    mocks.signOut.mockReset().mockResolvedValue({ error: null });
  });

  it("solicita o fluxo oficial sem revelar se a conta existe", async () => {
    const form = new FormData();
    form.set("email", "pessoa@example.test");
    form.set("website", "");

    await expect(requestPasswordRecovery(form)).rejects.toThrow(
      "REDIRECT:/esqueci-senha?status=sent",
    );
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("pessoa@example.test", {
      captchaToken: undefined,
      redirectTo: "https://example.invalid/auth/confirm?next=%2Fredefinir-senha",
    });
  });

  it("atualiza a senha somente com sessão de recuperação válida", async () => {
    const form = new FormData();
    form.set("password", "Senha-Nova-2026!");
    form.set("confirmPassword", "Senha-Nova-2026!");

    await expect(updateRecoveredPassword(form)).rejects.toThrow(
      "REDIRECT:/login?status=password-updated",
    );
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "Senha-Nova-2026!" });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("rejeita senhas divergentes antes de chamar o provedor", async () => {
    const form = new FormData();
    form.set("password", "Senha-Nova-2026!");
    form.set("confirmPassword", "Outra-Senha-2026!");

    await expect(updateRecoveredPassword(form)).rejects.toThrow(
      "REDIRECT:/redefinir-senha?status=invalid",
    );
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
