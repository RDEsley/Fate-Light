import { type NextRequest, NextResponse } from "next/server";

import { appendNextPath } from "@/lib/auth/redirects";
import { guestCookieName, guestCookieValue } from "@/lib/demo/guest";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { publicEnvironment } from "@/config/env/public";

const protectedPrefixes = [
  "/onboarding",
  "/perfil",
  "/configuracoes",
  "/dashboard",
  "/clientes",
  "/servicos",
  "/cobrancas",
  "/despesas",
  "/dominios",
  "/alertas",
  "/historico",
  "/importar",
] as const;
const guestOnlyPaths = new Set(["/login", "/cadastro"]);

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export function applySecurityHeaders(response: NextResponse) {
  const supabaseOrigin = new URL(publicEnvironment.NEXT_PUBLIC_SUPABASE_URL).origin;
  const isDevelopment = process.env.NODE_ENV === "development";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")} https://challenges.cloudflare.com`,
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    "font-src 'self' data:",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", policy);
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { authenticated, response } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Visitante: sem sessão, com o cookie do modo de demonstração. Ele abre as telas do
  // sistema (que leem dados fictícios), mas não o onboarding, que é o cadastro de verdade.
  const guest = !authenticated && request.cookies.get(guestCookieName)?.value === guestCookieValue;
  const guestCanView = guest && !pathname.startsWith("/onboarding");
  // Quem entrou de verdade não carrega o modo visitante adiante.
  if (authenticated && request.cookies.has(guestCookieName)) {
    response.cookies.delete(guestCookieName);
  }

  if (!authenticated && isProtected && !guestCanView) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = new URLSearchParams({
      next: `${pathname}${request.nextUrl.search}`,
    }).toString();
    return applySecurityHeaders(copyCookies(response, NextResponse.redirect(destination)));
  }

  if (authenticated && guestOnlyPaths.has(pathname)) {
    const destination = new URL(appendNextPath("/auth/continue", "/dashboard"), request.url);
    return applySecurityHeaders(copyCookies(response, NextResponse.redirect(destination)));
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
