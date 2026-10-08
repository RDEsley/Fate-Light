import { type NextRequest, NextResponse } from "next/server";

import { getAccountDestination } from "@/lib/auth/account-gate";
import { appendNextPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || typeof data?.claims?.sub !== "string") {
    return NextResponse.redirect(
      new URL(
        appendNextPath("/login", request.nextUrl.searchParams.get("next") ?? "/dashboard"),
        request.url,
      ),
    );
  }

  // Redefinir a senha vale para qualquer conta com sessão válida, inclusive a que ainda
  // não concluiu o cadastro: o link de recuperação não pode terminar em outra tela e
  // deixar a pessoa sem senha.
  if (sanitizeNextPath(request.nextUrl.searchParams.get("next")) === "/redefinir-senha") {
    return NextResponse.redirect(new URL("/redefinir-senha", request.url));
  }

  const destination = await getAccountDestination(
    supabase,
    request.nextUrl.searchParams.get("next"),
  );
  return NextResponse.redirect(new URL(destination.path, request.url));
}
