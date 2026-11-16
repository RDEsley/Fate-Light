import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/config/env/server";
import { isValidWebhookSignature, parseWebhookStatuses } from "@/features/whatsapp/cloud-api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function sameText(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Verificação feita pela Meta ao cadastrar o webhook. */
export async function GET(request: Request) {
  const { WHATSAPP_WEBHOOK_VERIFY_TOKEN } = getServerEnvironment();
  const params = new URL(request.url).searchParams;
  const challenge = params.get("hub.challenge");

  if (
    WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    params.get("hub.mode") === "subscribe" &&
    challenge &&
    sameText(params.get("hub.verify_token") ?? "", WHATSAPP_WEBHOOK_VERIFY_TOKEN)
  ) {
    return new Response(challenge, { headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Status de entrega das mensagens (enviado, entregue, lido, falhou). ADR-0024. */
export async function POST(request: Request) {
  const { WHATSAPP_APP_SECRET } = getServerEnvironment();
  const supabase = createAdminSupabaseClient();
  if (!WHATSAPP_APP_SECRET || !supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (
    !isValidWebhookSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      WHATSAPP_APP_SECRET,
    )
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  for (const status of parseWebhookStatuses(payload)) {
    await supabase.rpc("record_whatsapp_status", {
      p_status: status.status,
      p_wa_message_id: status.messageId,
      ...(status.error ? { p_error_message: status.error } : {}),
    });
  }

  // A Meta reenvia o evento enquanto não recebe 200; status desconhecidos são ignorados.
  return NextResponse.json({ received: true });
}
