import { type NextRequest, NextResponse } from "next/server";

import { appendNextPath } from "@/lib/auth/redirects";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const protectedPrefixes = [
  "/onboarding",
  "/perfil",
  "/configuracoes",
  "/dashboard",
  "/clientes",
  "/cobrancas",
  "/despesas",
  "/dominios",
] as const;
const guestOnlyPaths = new Set(["/login", "/cadastro"]);

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request: NextRequest) {
  const { authenticated, response } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!authenticated && isProtected) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = new URLSearchParams({
      next: `${pathname}${request.nextUrl.search}`,
    }).toString();
    return copyCookies(response, NextResponse.redirect(destination));
  }

  if (authenticated && guestOnlyPaths.has(pathname)) {
    const destination = new URL(appendNextPath("/auth/continue", "/perfil"), request.url);
    return copyCookies(response, NextResponse.redirect(destination));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
