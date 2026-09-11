import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/config/env/public", () => ({
  publicEnvironment: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getClaims: authMocks.getClaims,
      signInWithPassword: authMocks.signInWithPassword,
      updateUser: authMocks.updateUser,
    },
  })),
}));

vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: {},
    workspaceId: "workspace-id",
  })),
}));

import { changePassword } from "@/app/perfil/actions";
import { initialActionState } from "@/lib/forms/action-state";

function passwordForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("currentPassword", "senha-atual-123");
  form.set("password", "senha-nova-456");
  form.set("confirmPassword", "senha-nova-456");
  form.set("captchaToken", "captcha-ok");
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

describe("changePassword", () => {
  beforeEach(() => {
    authMocks.getClaims.mockReset();
    authMocks.signInWithPassword.mockReset();
    authMocks.updateUser.mockReset();
    authMocks.getClaims.mockResolvedValue({
      data: { claims: { email: "pessoa@example.test", sub: "user-1" } },
      error: null,
    });
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.updateUser.mockResolvedValue({ error: null });
  });

  it("atualiza a senha após confirmar a atual", async () => {
    const result = await changePassword(initialActionState, passwordForm());

    expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
      email: "pessoa@example.test",
      options: { captchaToken: "captcha-ok" },
      password: "senha-atual-123",
    });
    expect(authMocks.updateUser).toHaveBeenCalledWith({ password: "senha-nova-456" });
    expect(result).toEqual({
      status: "success",
      message: "Senha atualizada com segurança.",
    });
  });

  it("exige verificação Turnstile quando a site key está configurada", async () => {
    const form = passwordForm();
    form.delete("captchaToken");

    const result = await changePassword(initialActionState, form);

    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "error",
      message: "Conclua a verificação de segurança e tente novamente.",
    });
  });

  it("rejeita senha atual incorreta", async () => {
    authMocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid" } });

    const result = await changePassword(initialActionState, passwordForm());

    expect(authMocks.updateUser).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/senha atual/i);
  });

  it("mapeia falha de captcha do Auth sem acusar senha errada", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      error: { message: "captcha verification process failed" },
    });

    const result = await changePassword(initialActionState, passwordForm());

    expect(authMocks.updateUser).not.toHaveBeenCalled();
    expect(result.message).toMatch(/verificação de segurança/i);
  });

  it("rejeita confirmação divergente", async () => {
    const result = await changePassword(
      initialActionState,
      passwordForm({ confirmPassword: "outra-senha" }),
    );

    expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
  });
});
