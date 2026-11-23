import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/config/env/server";
import { AGENT_CONSENT_VERSION } from "@/features/assistant/config";
import { isSameOrigin } from "@/features/assistant/request";
import { resolveAssistantActor } from "@/features/assistant/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, message: string) =>
  NextResponse.json({ message }, { headers: { "Cache-Control": "no-store" }, status });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Origem não permitida.");

  const actor = await resolveAssistantActor();
  if (!actor || actor.guest) return fail(401, "Entre na sua conta para aceitar.");
  if (!getServerEnvironment().AGENT_REAL_DATA_ENABLED) {
    return fail(403, "O assistente ainda não está disponível para contas.");
  }

  const { error } = await actor.supabase.rpc("accept_agent_consent", {
    p_version: AGENT_CONSENT_VERSION,
    p_workspace_id: actor.workspaceId,
  });
  if (error) return fail(500, "Não consegui registrar o aceite. Tente de novo.");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
