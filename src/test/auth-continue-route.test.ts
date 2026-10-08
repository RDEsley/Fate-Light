import { NextRequest } from "next/server";
import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  destination: vi.fn(),
}));

vi.mock("@/lib/auth/account-gate", () => ({ getAccountDestination: mocks.destination }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getClaims: mocks.claims } })),
}));

import { GET } from "@/app/auth/continue/route";

const request = (query = "") => new NextRequest(`https://app.example/auth/continue${query}`);

describe("auth continue route", () => {
  beforeEach(() => {
    mocks.claims
      .mockReset()
      .mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null });
    mocks.destination.mockReset().mockResolvedValue({ kind: "active", path: "/clientes" });
  });

  it("manda para o login quem chega sem sessão, preservando o destino", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: {} }, error: null });

    const response = await GET(request("?next=%2Fclientes"));

    expect(response.headers.get("location")).toBe("https://app.example/login?next=%2Fclientes");
    expect(mocks.destination).not.toHaveBeenCalled();
  });

  it("segue o estado da conta para os demais destinos", async () => {
    const response = await GET(request("?next=%2Fclientes"));

    expect(mocks.destination).toHaveBeenCalledWith(expect.anything(), "/clientes");
    expect(response.headers.get("location")).toBe("https://app.example/clientes");
  });

  it("leva o link de recuperação à nova senha mesmo com o cadastro pendente", async () => {
    mocks.destination.mockResolvedValue({ kind: "onboarding", path: "/onboarding" });

    const response = await GET(request("?next=%2Fredefinir-senha"));

    expect(response.headers.get("location")).toBe("https://app.example/redefinir-senha");
    expect(mocks.destination).not.toHaveBeenCalled();
  });

  it("não aceita destino externo disfarçado de recuperação", async () => {
    const response = await GET(request("?next=%2F%2Fevil.example%2Fredefinir-senha"));

    expect(mocks.destination).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://app.example/clientes");
  });
});
