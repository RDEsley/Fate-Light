"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { publicEnvironment } from "@/config/env/public";
import { getAccountDestination } from "@/lib/auth/account-gate";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const magicLinkRequestSchema = z
  .object({
    captchaToken: z.string().max(4096).optional(),
    displayName: z.string().trim().max(120),
    email: z.string().trim().email().max(254),
    mode: z.enum(["login", "signup"]),
    next: z.string().max(2048).optional(),
    website: z.string().max(256),
  })
  .refine((value) => value.mode === "login" || value.displayName.length >= 2, {
    path: ["displayName"],
  });

const passwordRequestSchema = z
  .object({
    captchaToken: z.string().max(4096).optional(),
    confirmPassword: z.string().max(72).optional(),
    displayName: z.string().trim().max(120),
    email: z.string().trim().email().max(254),
    mode: z.enum(["login", "signup"]),
    next: z.string().max(2048).optional(),
    password: z.string().min(8).max(72),
    website: z.string().max(256),
  })
  .superRefine((value, context) => {
    if (value.mode === "signup" && value.displayName.length < 2) {
      context.addIssue({ code: "custom", path: ["displayName"] });
    }
    if (value.mode === "signup" && value.password !== value.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"] });
    }
  });

const recoveryRequestSchema = z.object({
  captchaToken: z.string().max(4096).optional(),
  email: z.string().trim().email().max(254),
  website: z.string().max(256),
});

const passwordResetSchema = z
  .object({
    confirmPassword: z.string().min(8).max(72),
    password: z.string().min(8).max(72),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
  });

type AuthStatus =
  | "captcha"
  | "confirmation-sent"
  | "email-rate-limit"
  | "error"
  | "invalid"
  | "invalid-credentials"
  | "sent";

function isEmailRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; status?: unknown };
  return (
    candidate.status === 429 ||
    candidate.code === "over_email_send_rate_limit" ||
    candidate.code === "over_request_rate_limit"
  );
}

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
    displayName: formData.get("displayName") ?? "",
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

  let rateLimited = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        captchaToken: parsed.data.captchaToken,
        ...(parsed.data.mode === "signup"
          ? { data: { display_name: parsed.data.displayName } }
          : {}),
        emailRedirectTo: confirmationUrl.toString(),
        shouldCreateUser: parsed.data.mode === "signup",
      },
    });
    rateLimited = isEmailRateLimitError(error);
  } catch (error) {
    rateLimited = isEmailRateLimitError(error);
    // A resposta permanece genérica para não revelar existência, bloqueio ou entrega do e-mail.
  }

  if (rateLimited) redirect(statusPath(mode, "email-rate-limit", "magic-link"));
  redirect(statusPath(mode, "sent", "magic-link"));
}

export async function authenticateWithPassword(formData: FormData) {
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const parsed = passwordRequestSchema.safeParse({
    captchaToken: formData.get("captchaToken") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
    displayName: formData.get("displayName") ?? "",
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
        data: { display_name: parsed.data.displayName },
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

export async function requestPasswordRecovery(formData: FormData) {
  const parsed = recoveryRequestSchema.safeParse({
    captchaToken: formData.get("captchaToken") || undefined,
    email: formData.get("email"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) redirect("/esqueci-senha?status=invalid");
  if (parsed.data.website) redirect("/esqueci-senha?status=sent");
  if (publicEnvironment.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !parsed.data.captchaToken) {
    redirect("/esqueci-senha?status=captcha");
  }

  const confirmationUrl = new URL("/auth/confirm", publicEnvironment.NEXT_PUBLIC_APP_URL);
  confirmationUrl.searchParams.set("next", "/redefinir-senha");
  let rateLimited = false;

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      captchaToken: parsed.data.captchaToken,
      redirectTo: confirmationUrl.toString(),
    });
    rateLimited = isEmailRateLimitError(error);
  } catch (error) {
    rateLimited = isEmailRateLimitError(error);
  }

  redirect(`/esqueci-senha?status=${rateLimited ? "email-rate-limit" : "sent"}` as Route);
}

export async function updateRecoveredPassword(formData: FormData) {
  const parsed = passwordResetSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/redefinir-senha?status=invalid");

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (typeof data?.claims?.sub !== "string") redirect("/auth/error");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect("/redefinir-senha?status=error");

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?status=password-updated");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  if (typeof data?.claims?.sub === "string") {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect("/login?status=signed-out");
}
