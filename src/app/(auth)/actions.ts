"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { publicEnvironment } from "@/config/env/public";
import { getAccountDestination } from "@/lib/auth/account-gate";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const magicLinkRequestSchema = z.object({
  captchaToken: z.string().max(4096).optional(),
  email: z.string().trim().email().max(254),
  mode: z.enum(["login", "signup"]),
  next: z.string().max(2048).optional(),
  website: z.string().max(256),
});

const passwordRequestSchema = z
  .object({
    captchaToken: z.string().max(4096).optional(),
    confirmPassword: z.string().max(72).optional(),
    email: z.string().trim().email().max(254),
    mode: z.enum(["login", "signup"]),
    next: z.string().max(2048).optional(),
    password: z.string().min(8).max(72),
    website: z.string().max(256),
  })
  .refine((value) => value.mode === "login" || value.password === value.confirmPassword, {
    path: ["confirmPassword"],
  });

type AuthStatus =
  "captcha" | "confirmation-sent" | "error" | "invalid" | "invalid-credentials" | "sent";

function statusPath(mode: "login" | "signup", status: AuthStatus, method?: "magic-link") {
  const pathname = mode === "login" ? "/login" : "/cadastro";
  const parameters = new URLSearchParams({ status });
  if (method) parameters.set("method", method);
  return `${pathname}?${parameters.toString()}` as Route;
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
    redirect(statusPath(mode, "invalid", "magic-link"));
  }

  if (parsed.data.website) {
    redirect(statusPath(mode, "sent", "magic-link"));
  }

  if (publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !parsed.data.captchaToken) {
    redirect(statusPath(mode, "captcha", "magic-link"));
  }

  const nextPath = sanitizeNextPath(
    parsed.data.next,
    parsed.data.mode === "signup" ? "/onboarding" : "/dashboard",
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

  redirect(statusPath(mode, "sent", "magic-link"));
}

export async function authenticateWithPassword(formData: FormData) {
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const parsed = passwordRequestSchema.safeParse({
    captchaToken: formData.get("captchaToken") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
    email: formData.get("email"),
    mode,
    next: formData.get("next") || undefined,
    password: formData.get("password"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) redirect(statusPath(mode, "invalid"));
  if (parsed.data.website) {
    redirect(statusPath(mode, mode === "signup" ? "confirmation-sent" : "invalid-credentials"));
  }
  if (publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !parsed.data.captchaToken) {
    redirect(statusPath(mode, "captcha"));
  }

  const nextPath = sanitizeNextPath(
    parsed.data.next,
    parsed.data.mode === "signup" ? "/onboarding" : "/dashboard",
  );
  const supabase = await createServerSupabaseClient();

  if (parsed.data.mode === "login") {
    let failed = false;
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { captchaToken: parsed.data.captchaToken },
      });
      failed = Boolean(error);
    } catch {
      failed = true;
    }
    if (failed) redirect(statusPath(mode, "invalid-credentials"));
    const destination = await getAccountDestination(supabase, nextPath);
    redirect(destination.path as Route);
  }

  const confirmationUrl = new URL("/auth/confirm", publicEnvironment.NEXT_PUBLIC_APP_URL);
  confirmationUrl.searchParams.set("next", nextPath);
  let hasSession = false;
  let failed = false;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        captchaToken: parsed.data.captchaToken,
        emailRedirectTo: confirmationUrl.toString(),
      },
    });
    failed = Boolean(error);
    hasSession = Boolean(data.session);
  } catch {
    failed = true;
  }

  if (failed) redirect(statusPath(mode, "error"));
  if (!hasSession) redirect(statusPath(mode, "confirmation-sent"));
  const destination = await getAccountDestination(supabase, nextPath);
  redirect(destination.path as Route);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  if (typeof data?.claims?.sub === "string") {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect("/login?status=signed-out");
}
