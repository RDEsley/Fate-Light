import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { requireActiveAccountOrGuest } from "@/lib/auth/page-guard";
import { demoWorkspaceContext } from "@/lib/demo/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const requireWorkspaceContext = cache(async function requireWorkspaceContext() {
  const userId = await requireActiveAccountOrGuest();
  if (!userId) return demoWorkspaceContext();

  const supabase = await createServerSupabaseClient();
  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).single(),
      supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name, timezone)")
        .eq("user_id", userId)
        .eq("role", "owner")
        .eq("status", "active")
        .single(),
    ]);

  if (profileError || membershipError || !profile || !membership?.workspaces?.name) {
    redirect("/auth/error");
  }

  return {
    fullName: profile.full_name,
    guest: false,
    supabase,
    userId,
    workspaceId: membership.workspace_id,
    workspaceName: membership.workspaces.name,
    workspaceTimezone: membership.workspaces.timezone,
  };
});
