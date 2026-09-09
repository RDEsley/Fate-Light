import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({
  authenticated: true,
  updateSupabaseSession: vi.fn(),
}));

vi.mock("@/lib/supabase/proxy", () => ({
  updateSupabaseSession: (...args: unknown[]) => sessionMocks.updateSupabaseSession(...args),
}));

vi.mock("@/config/env/public", () => ({
  publicEnvironment: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile",
  },
}));

import { proxy } from "@/proxy";

describe("proxy guest redirect for authenticated users", () => {
  beforeEach(() => {
    sessionMocks.authenticated = true;
    sessionMocks.updateSupabaseSession.mockImplementation(async (request: NextRequest) => ({
      authenticated: sessionMocks.authenticated,
      response: NextResponse.next({ request }),
    }));
  });

  it("envia /login autenticado para continue com next=/dashboard", async () => {
    const response = await proxy(new NextRequest("https://app.example/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example/auth/continue?next=%2Fdashboard",
    );
  });

  it("envia /cadastro autenticado para continue com next=/dashboard", async () => {
    const response = await proxy(new NextRequest("https://app.example/cadastro"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example/auth/continue?next=%2Fdashboard",
    );
  });

  it("não redireciona a landing pública autenticada", async () => {
    const response = await proxy(new NextRequest("https://app.example/"));
    expect(response.status).toBe(200);
  });
});
