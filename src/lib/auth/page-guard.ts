import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAccountDestination } from "@/lib/auth/account-gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAccountPage(expected: "active" | "onboarding") {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || typeof data?.claims?.sub !== "string") {
    redirect("/login");
  }

  const destination = await getAccountDestination(supabase);

  if (destination.kind !== expected) {
    redirect(destination.path as Route);
  }

  return data.claims.sub;
}
