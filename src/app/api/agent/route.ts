import { createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/config/env/server";
import { streamAssistant } from "@/features/assistant/agent";
import { agentErrorMessages, classifyAgentError } from "@/features/assistant/errors";
import { quotaExhaustedMessage, quotaUnavailableMessage } from "@/features/assistant/limits";
import { isSameOrigin, parseAssistantRequest } from "@/features/assistant/request";
import {
  approvalSecret,
  assistantGateways,
  assistantModel,
  consumeAssistantQuota,
  hasAssistantConsent,
  recordAssistantRun,
  resolveAssistantActor,
  type AssistantActor,
} from "@/features/assistant/server";
import { createAssistantTools } from "@/features/assistant/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ code, message }, { headers: { "Cache-Control": "no-store" }, status });

const unavailableMessage =
  "O assistente ainda não foi configurado neste ambiente. O resto do sistema segue normal.";
const realDataDisabledMessage =
  "O assistente está disponível por enquanto só no modo visitante, com dados fictícios.";

async function assistantStatus(actor: AssistantActor) {
  if (!assistantModel()) return "unavailable" as const;
  if (actor.guest) return "ready" as const;
  if (!getServerEnvironment().AGENT_REAL_DATA_ENABLED) return "real_data_disabled" as const;
  return (await hasAssistantConsent(actor)) ? ("ready" as const) : ("consent_required" as const);
}

export async function GET() {
  const actor = await resolveAssistantActor();
  if (!actor) return fail(401, "unauthenticated", "Entre na sua conta para usar o assistente.");
  return NextResponse.json(
    { guest: actor.guest, status: await assistantStatus(actor) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "forbidden", "Origem não permitida.");

  const actor = await resolveAssistantActor();
  if (!actor) return fail(401, "unauthenticated", "Entre na sua conta para usar o assistente.");

  const status = await assistantStatus(actor);
  if (status === "unavailable") return fail(503, status, unavailableMessage);
  if (status === "real_data_disabled") return fail(403, status, realDataDisabledMessage);
  if (status === "consent_required") {
    return fail(403, status, "Aceite o aviso de privacidade para usar o assistente.");
  }

  const resolved = assistantModel();
  if (!resolved) return fail(503, "unavailable", unavailableMessage);

  const { reader, writer } = assistantGateways(actor);
  const parsed = await parseAssistantRequest(
    await request.text(),
    createAssistantTools(reader, writer),
  );
  if (!parsed) return fail(400, "invalid_request", "Não entendi esse pedido. Tente reescrever.");

  const quota = await consumeAssistantQuota(actor, parsed.kind, request.headers);
  if (!quota) return fail(503, "quota_unavailable", quotaUnavailableMessage);
  if (!quota.allowed) return fail(429, "daily_limit", quotaExhaustedMessage);

  try {
    const stream = await streamAssistant({
      approvalSecret: approvalSecret(),
      messages: parsed.messages,
      model: resolved.model,
      onEnd: (result) => recordAssistantRun(actor, parsed.question, resolved.label(), result),
      reader,
      signal: request.signal,
      today: actor.today,
      writer,
    });
    return createUIMessageStreamResponse({
      headers: { "Cache-Control": "no-store", "X-Agent-Remaining": String(quota.remaining) },
      stream,
    });
  } catch (error) {
    const code = classifyAgentError(error);
    return fail(code === "quota" ? 429 : 500, code, agentErrorMessages[code]);
  }
}
