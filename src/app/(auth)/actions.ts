"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { publicEnvironment } from "@/config/env/public";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const magicLinkRequestSchema = z.object({
  captchaToken: z.string().max(4096).optional(),
  email: z.string().trim().email().max(254),
  mode: z.enum(["login", "signup"]),
  next: z.string().max(2048).optional(),
  website: z.string().max(256),
});

function statusPath(mode: "login" | "signup", status: "captcha" | "invalid" | "sent") {
  const pathname = mode === "login" ? "/login" : "/cadastro";
  return `${pathname}?status=${status}` as Route;
}

export async function requestMagicLink(formData: FormData) {
  const rawMode = formData.get("mode");
  const mode = rawMode === "signup" ? "signup" : "login";
  const parsed = magicLinkRequestSchema.safeParse({
    captchaToken: formData.get("captchaToken") || undefined,
    email: formData.get("email"),
    mode,
    next: formData.get("next") || undefined,
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    redirect(statusPath(mode, "invalid"));
  }

  if (parsed.data.website) {
    redirect(statusPath(mode, "sent"));
  }

  if (publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !parsed.data.captchaToken) {
    redirect(statusPath(mode, "captcha"));
  }

  const nextPath = sanitizeNextPath(
    parsed.data.next,
    parsed.data.mode === "signup" ? "/onboarding" : "/perfil",
  );
  const confirmationUrl = new URL("/auth/confirm", publicEnvironment.NEXT_PUBLIC_APP_URL);
  confirmationUrl.searchParams.set("next", nextPath);

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        captchaToken: parsed.data.captchaToken,
        emailRedirectTo: confirmationUrl.toString(),
        shouldCreateUser: parsed.data.mode === "signup",
      },
    });
  } catch {
    // A resposta permanece genérica para não revelar existência, bloqueio ou entrega do e-mail.
  }

  redirect(statusPath(mode, "sent"));
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  if (typeof data?.claims?.sub === "string") {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect("/login?status=signed-out");
}
