import { NextResponse } from "next/server";

import { applySecurityHeaders } from "@/proxy";

it("aplica o hardening HTTP sem bloquear Supabase ou Turnstile", () => {
  const response = applySecurityHeaders(NextResponse.next());
  const policy = response.headers.get("content-security-policy");

  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("https://example.supabase.co");
  expect(policy).toContain("https://challenges.cloudflare.com");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
});
