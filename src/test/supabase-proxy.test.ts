import { NextRequest } from "next/server";
import { vi } from "vitest";

const proxyMocks = vi.hoisted(() => ({
  claimsResult: { data: { claims: { sub: "user-id" } } } as {
    data: { claims: { sub?: string } };
  },
  options: undefined as
    | {
        cookies: {
          getAll: () => Array<{ name: string; value: string }>;
          setAll: (
            cookies: Array<{
              name: string;
              value: string;
              options?: { httpOnly?: boolean; path?: string };
            }>,
          ) => void;
        };
      }
    | undefined,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...arguments_: unknown[]) => {
    proxyMocks.options = arguments_[2] as typeof proxyMocks.options;
    return {
      auth: {
        getClaims: async () => {
          proxyMocks.options?.cookies.setAll([
            {
              name: "session",
              options: { httpOnly: true, path: "/" },
              value: "renewed",
            },
          ]);
          return proxyMocks.claimsResult;
        },
      },
    };
  },
}));

import { updateSupabaseSession } from "@/lib/supabase/proxy";

describe("Supabase session proxy", () => {
  beforeEach(() => {
    proxyMocks.claimsResult = { data: { claims: { sub: "user-id" } } };
  });

  it("renova cookies e reconhece claims verificadas", async () => {
    const request = new NextRequest("https://example.invalid/perfil", {
      headers: { cookie: "session=before" },
    });

    const result = await updateSupabaseSession(request);

    expect(proxyMocks.options?.cookies.getAll()).toEqual([
      expect.objectContaining({ name: "session", value: "renewed" }),
    ]);
    expect(result.authenticated).toBe(true);
    expect(result.response.cookies.get("session")).toMatchObject({
      httpOnly: true,
      value: "renewed",
    });
  });

  it("falha fechado quando as claims não possuem sujeito", async () => {
    proxyMocks.claimsResult = { data: { claims: {} } };
    const request = new NextRequest("https://example.invalid/perfil");

    expect(await updateSupabaseSession(request)).toMatchObject({ authenticated: false });
  });
});
