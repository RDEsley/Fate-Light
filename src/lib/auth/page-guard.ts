import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAccountDestination } from "@/lib/auth/account-gate";
import { hasGuestCookie, isActionRequest } from "@/lib/demo/session";
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

/**
 * Entrada das telas do sistema: conta ativa ou visitante. A sessão real sempre vence o
 * cookie de visitante — quem entrou de verdade nunca cai nos dados fictícios. O visitante
 * só navega: se a requisição for uma Server Action, ela para aqui, antes de qualquer
 * acesso a dados, e a pessoa vai para o login com o aviso.
 */
export async function requireActiveAccountOrGuest(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || typeof data?.claims?.sub !== "string") {
    if (!(await hasGuestCookie())) redirect("/login");
    if (await isActionRequest()) redirect("/login?status=guest");
    return null;
  }

  const destination = await getAccountDestination(supabase);

  if (destination.kind !== "active") {
    redirect(destination.path as Route);
  }

  return data.claims.sub;
}
