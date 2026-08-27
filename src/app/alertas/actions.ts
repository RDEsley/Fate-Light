"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const manualAlertSchema = z.object({
  dueOn: z.iso.date(),
  notes: z.string().trim().max(1000).optional(),
  severity: z.enum(["danger", "warning"]),
  title: z.string().trim().min(2).max(120),
});

export async function createManualAlert(formData: FormData) {
  const parsed = manualAlertSchema.safeParse({
    dueOn: formData.get("dueOn"),
    notes: formData.get("notes") || undefined,
    severity: formData.get("severity"),
    title: formData.get("title"),
  });
  if (!parsed.success) redirect("/alertas?status=invalid");

  const context = await requireWorkspaceContext();
  const { error } = await context.supabase.from("manual_alerts").insert({
    due_on: parsed.data.dueOn,
    notes: parsed.data.notes,
    severity: parsed.data.severity,
    title: parsed.data.title,
    workspace_id: context.workspaceId,
  });
  if (error) redirect("/alertas?status=error");
  revalidatePath("/alertas");
  redirect("/alertas?status=created");
}

export async function resolveManualAlert(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/alertas?status=error");
  const context = await requireWorkspaceContext();
  const { error } = await context.supabase
    .from("manual_alerts")
    .update({ resolved_at: new Date().toISOString(), state: "resolved" })
    .eq("id", id.data)
    .eq("workspace_id", context.workspaceId)
    .eq("state", "open");
  if (error) redirect("/alertas?status=error");
  revalidatePath("/alertas");
  redirect("/alertas?status=resolved");
}
