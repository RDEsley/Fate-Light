import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeNextPath } from "@/lib/auth/redirects";
import type { Database } from "@/types/database.generated";

type AccountGate = {
  has_profile: boolean;
  account_status: string | null;
  has_workspace: boolean;
  workspace_status: string | null;
};

export type AccountDestination =
  | { kind: "active"; path: string }
  | { kind: "onboarding"; path: "/onboarding" }
  | { kind: "suspended"; path: "/conta-suspensa" }
  | { kind: "error"; path: "/auth/error" };

export function resolveAccountDestination(
  gate: AccountGate | null,
  requestedPath?: string | null,
): AccountDestination {
  if (!gate) {
    return { kind: "error", path: "/auth/error" };
  }

  if (!gate.has_profile) {
    return { kind: "onboarding", path: "/onboarding" };
  }

  if (gate.account_status !== "active") {
    return { kind: "suspended", path: "/conta-suspensa" };
  }

  if (!gate.has_workspace) {
    return { kind: "onboarding", path: "/onboarding" };
  }

  if (gate.workspace_status !== "active") {
    return { kind: "suspended", path: "/conta-suspensa" };
  }

  const nextPath = sanitizeNextPath(requestedPath);
  const safePath = nextPath.startsWith("/auth/") ? "/perfil" : nextPath;
  return { kind: "active", path: safePath };
}

export async function getAccountDestination(
  supabase: SupabaseClient<Database>,
  requestedPath?: string | null,
) {
  const { data, error } = await supabase.rpc("get_current_account_gate").maybeSingle();

  if (error) {
    return resolveAccountDestination(null, requestedPath);
  }

  return resolveAccountDestination(data, requestedPath);
}
