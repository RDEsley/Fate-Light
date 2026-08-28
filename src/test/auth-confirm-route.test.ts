import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: authMocks })),
}));

import { GET } from "@/app/auth/confirm/route";

function request(parameters: string) {
  const url = `https://example.invalid/auth/confirm?${parameters}`;
  return { nextUrl: new URL(url), url } as never;
}

describe("auth confirmation route", () => {
  beforeEach(() => {
    authMocks.exchangeCodeForSession.mockReset();
    authMocks.verifyOtp.mockReset();
    authMocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    authMocks.verifyOtp.mockResolvedValue({ error: null });
  });

  it("confirma o token hash usado pelos templates SSR personalizados", async () => {
    const response = await GET(request("token_hash=token-value&type=email&next=%2Fonboarding"));

    expect(authMocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "token-value",
      type: "email",
    });
    expect(authMocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://example.invalid/auth/continue?next=%2Fonboarding",
    );
  });

  it("troca o code usado pelo template padrão do projeto remoto", async () => {
    const response = await GET(request("code=pkce-code&next=%2Fdashboard"));

    expect(authMocks.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(authMocks.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://example.invalid/auth/continue?next=%2Fdashboard",
    );
  });

  it("aceita o token oficial de recuperação de senha", async () => {
    const response = await GET(
      request("token_hash=recovery-token&type=recovery&next=%2Fredefinir-senha"),
    );

    expect(authMocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "recovery-token",
      type: "recovery",
    });
    expect(response.headers.get("location")).toBe(
      "https://example.invalid/auth/continue?next=%2Fredefinir-senha",
    );
  });

  it("rejeita parâmetros inválidos sem trocar uma sessão", async () => {
    const response = await GET(request("type=email&next=https%3A%2F%2Fevil.example"));

    expect(authMocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(authMocks.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://example.invalid/auth/error");
  });
});
