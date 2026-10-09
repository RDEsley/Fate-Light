"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  alertRecurrenceValues,
  nextAlertDate,
  parseAlertRecurrence,
} from "@/features/alerts/board";
import { addDays, isoDateInTimeZone } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

const manualAlertSchema = z.object({
  clientId: z.uuid().optional(),
  dueOn: z.iso.date(),
  notes: z.string().trim().max(1000).optional(),
  recurrence: z.enum(alertRecurrenceValues).default("none"),
  severity: z.enum(["danger", "warning"]),
  title: z.string().trim().min(2).max(120),
});

export async function createManualAlert(formData: FormData) {
  const parsed = manualAlertSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    dueOn: formData.get("dueOn"),
    notes: formData.get("notes") || undefined,
    recurrence: formData.get("recurrence") || undefined,
    severity: formData.get("severity"),
    title: formData.get("title"),
  });
  if (!parsed.success) redirect("/alertas?status=invalid");

  const context = await requireWorkspaceContext();
  // O cliente não é conferido aqui: a FK composta com o workspace recusa um id alheio.
  const { error } = await context.supabase.from("manual_alerts").insert({
    client_id: parsed.data.clientId ?? null,
    due_on: parsed.data.dueOn,
    notes: parsed.data.notes,
    recurrence: parsed.data.recurrence,
    severity: parsed.data.severity,
    title: parsed.data.title,
    workspace_id: context.workspaceId,
  });
  if (error) redirect("/alertas?status=error");
  revalidatePath("/alertas");
  redirect("/alertas?status=created");
}

const snoozeSchema = z.object({
  days: z.enum(["1", "7", "30"]),
  id: z.uuid(),
});

/**
 * Adia um lembrete a partir de hoje, não da data antiga: adiar "7 dias" um lembrete que
 * venceu há um mês tem de tirá-lo do atraso, e não mantê-lo vencido.
 */
export async function snoozeManualAlert(formData: FormData) {
  const parsed = snoozeSchema.safeParse({
    days: formData.get("days"),
    id: formData.get("id"),
  });
  if (!parsed.success) redirect("/alertas?status=error");

  const context = await requireWorkspaceContext();
  const dueOn = addDays(isoDateInTimeZone(context.workspaceTimezone), Number(parsed.data.days));
  const { error } = await context.supabase
    .from("manual_alerts")
    .update({ due_on: dueOn })
    .eq("id", parsed.data.id)
    .eq("workspace_id", context.workspaceId)
    .eq("state", "open");
  if (error) redirect("/alertas?status=error");
  revalidatePath("/alertas");
  redirect("/alertas?status=snoozed");
}

/**
 * Resolve um lembrete e, se ele se repete, agenda a próxima ocorrência. A cópia só é
 * criada por quem de fato fechou o lembrete: um segundo envio não encontra linha aberta e
 * não duplica a série.
 */
export async function resolveManualAlert(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/alertas?status=error");
  const context = await requireWorkspaceContext();
  const { data: resolved, error } = await context.supabase
    .from("manual_alerts")
    .update({ resolved_at: new Date().toISOString(), state: "resolved" })
    .eq("id", id.data)
    .eq("workspace_id", context.workspaceId)
    .eq("state", "open")
    .select("title, notes, due_on, severity, client_id, recurrence")
    .maybeSingle();
  if (error) redirect("/alertas?status=error");
  revalidatePath("/alertas");

  const recurrence = parseAlertRecurrence(resolved?.recurrence);
  const nextDue = resolved
    ? nextAlertDate(resolved.due_on, recurrence, isoDateInTimeZone(context.workspaceTimezone))
    : null;
  if (!resolved || !nextDue) redirect("/alertas?status=resolved");

  const { error: nextError } = await context.supabase.from("manual_alerts").insert({
    client_id: resolved.client_id,
    due_on: nextDue,
    notes: resolved.notes,
    recurrence,
    severity: resolved.severity,
    title: resolved.title,
    workspace_id: context.workspaceId,
  });
  redirect(nextError ? "/alertas?status=repeat-error" : "/alertas?status=repeated");
}
