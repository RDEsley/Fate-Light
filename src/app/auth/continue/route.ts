import { type NextRequest, NextResponse } from "next/server";

import { getAccountDestination } from "@/lib/auth/account-gate";
import { appendNextPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || typeof data?.claims?.sub !== "string") {
    return NextResponse.redirect(
      new URL(
        appendNextPath("/login", request.nextUrl.searchParams.get("next") ?? "/perfil"),
        request.url,
      ),
    );
  }

  const destination = await getAccountDestination(
    supabase,
    request.nextUrl.searchParams.get("next"),
  );
  return NextResponse.redirect(new URL(destination.path, request.url));
}
