import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/config/env/server";
import { sendTemplateMessage } from "@/features/whatsapp/cloud-api";
import { runReminders } from "@/features/whatsapp/run-reminders";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(header ?? "", "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Chamado pelo Vercel Cron uma vez por dia (vercel.json). ADR-0024. */
export async function GET(request: Request) {
  const { CRON_SECRET } = getServerEnvironment();
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const summary = await runReminders({
      claim: async () => {
        const { data, error } = await supabase.rpc("claim_whatsapp_reminders", {});
        if (error) throw new Error("claim_failed");
        return data ?? [];
      },
      record: async (deliveryId, messageId, sendError) => {
        // Argumentos ausentes valem `null` na função: sucesso grava o id, falha grava o erro.
        await supabase.rpc("record_whatsapp_send_result", {
          p_delivery_id: deliveryId,
          ...(messageId ? { p_wa_message_id: messageId } : {}),
          ...(sendError ? { p_error_message: sendError } : {}),
        });
      },
      send: (input) => sendTemplateMessage(input),
    });
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "run_failed" }, { status: 500 });
  }
}
