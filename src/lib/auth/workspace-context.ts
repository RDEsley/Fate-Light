import "server-only";

import { redirect } from "next/navigation";

import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireWorkspaceContext() {
  const userId = await requireAccountPage("active");
  const supabase = await createServerSupabaseClient();
  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, theme").eq("id", userId).single(),
      supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .eq("role", "owner")
        .eq("status", "active")
        .single(),
    ]);

  if (profileError || membershipError || !profile || !membership) {
    redirect("/auth/error");
  }

  return {
    fullName: profile.full_name,
    supabase,
    theme: profile.theme,
    userId,
    workspaceId: membership.workspace_id,
  };
}
