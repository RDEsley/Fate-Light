import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { appendNextPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const acceptedTypes = new Set<EmailOtpType>(["email", "magiclink", "recovery"]);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  if (tokenHash && type && acceptedTypes.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return NextResponse.redirect(
        new URL(appendNextPath("/auth/continue", nextPath), request.url),
      );
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(appendNextPath("/auth/continue", nextPath), request.url),
      );
    }
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
