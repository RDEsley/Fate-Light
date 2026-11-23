import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/config/env/server";
import { isoDateInTimeZone } from "@/features/mvp/format";
import { getAccountDestination } from "@/lib/auth/account-gate";
import { demoWorkspaceContext, hasGuestCookie } from "@/lib/demo/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.generated";

import type { AssistantRunResult } from "./agent";
import { AGENT_CONSENT_VERSION, AGENT_DEFAULT_GUEST_CAP } from "./config";
import { createAssistantReader, createAssistantWriter, createDemoAssistantWriter } from "./data";
import { clientIp, createMemoryQuota, hashIp, type QuotaKind, type QuotaResult } from "./limits";
import { resolveAssistantModel } from "./model";
import { createScriptedModel } from "./scripted-model";
import { maskQuestion } from "./untrusted";

export type AssistantActor = {
  guest: boolean;
  supabase: SupabaseClient<Database>;
  today: string;
  userId: string;
  workspaceId: string;
};

/** Como `requireWorkspaceContext`, mas responde em vez de redirecionar: isto é uma API. */
export async function resolveAssistantActor(): Promise<AssistantActor | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    if (!(await hasGuestCookie())) return null;
    const demo = demoWorkspaceContext();
    return {
      guest: true,
      supabase: demo.supabase,
      today: isoDateInTimeZone(demo.workspaceTimezone),
      userId: demo.userId,
      workspaceId: demo.workspaceId,
    };
  }

  const destination = await getAccountDestination(supabase);
  if (destination.kind !== "active") return null;

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(timezone)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "active")
    .single();
  if (membershipError || !membership?.workspaces?.timezone) return null;

  return {
    guest: false,
    supabase,
    today: isoDateInTimeZone(membership.workspaces.timezone),
    userId,
    workspaceId: membership.workspace_id,
  };
}

export function assistantGateways(actor: AssistantActor) {
  const reader = createAssistantReader(actor);
  return {
    reader,
    writer: actor.guest ? createDemoAssistantWriter(reader) : createAssistantWriter(actor),
  };
}

export function assistantModel() {
  const environment = getServerEnvironment();
  if (environment.AGENT_SCRIPTED_MODEL && process.env.NODE_ENV !== "production") {
    return { label: () => "scripted", model: createScriptedModel() };
  }
  return resolveAssistantModel(environment);
}

export function approvalSecret() {
  const environment = getServerEnvironment();
  if (environment.AGENT_APPROVAL_SECRET) return environment.AGENT_APPROVAL_SECRET;
  // O E2E não tem segredos: o valor fixo só existe com o modelo roteirizado fora de produção.
  return environment.AGENT_SCRIPTED_MODEL && process.env.NODE_ENV !== "production"
    ? "scripted-e2e-approval-secret-not-for-production"
    : undefined;
}

export async function hasAssistantConsent(actor: AssistantActor) {
  if (actor.guest) return true;
  const { data, error } = await actor.supabase
    .from("agent_consents")
    .select("version")
    .eq("workspace_id", actor.workspaceId)
    .maybeSingle();
  return !error && data?.version === AGENT_CONSENT_VERSION;
}

const globalForQuota = globalThis as typeof globalThis & {
  assistantMemoryQuota?: ReturnType<typeof createMemoryQuota>;
};

/** Falha fechada: sem contador confiável em produção, a mensagem não vai ao modelo. */
export async function consumeAssistantQuota(
  actor: AssistantActor,
  kind: QuotaKind,
  headers: Headers,
): Promise<QuotaResult | null> {
  if (!actor.guest) {
    const { data, error } = await actor.supabase
      .rpc("consume_agent_quota", { p_kind: kind })
      .single();
    return error || !data ? null : data;
  }

  const environment = getServerEnvironment();
  const admin = createAdminSupabaseClient();
  const salt = environment.AGENT_IP_HASH_SALT;
  const guestCap = environment.AGENT_GUEST_DAILY_CAP ?? AGENT_DEFAULT_GUEST_CAP;
  if (admin && salt) {
    const { data, error } = await admin
      .rpc("consume_guest_agent_quota", {
        p_global_cap: guestCap,
        p_ip_hash: hashIp(clientIp(headers), salt),
        p_kind: kind,
      })
      .single();
    return error || !data ? null : data;
  }
  if (process.env.NODE_ENV === "production") return null;

  globalForQuota.assistantMemoryQuota ??= createMemoryQuota(guestCap);
  return globalForQuota.assistantMemoryQuota(clientIp(headers), kind);
}

/** O registro nunca derruba a resposta: falhar aqui só perde uma linha de histórico. */
export async function recordAssistantRun(
  actor: AssistantActor,
  question: string,
  modelLabel: string,
  result: AssistantRunResult,
) {
  const fields = {
    duration_ms: Math.round(result.durationMs),
    error_code: result.errorCode,
    model: modelLabel.slice(0, 80),
    outcome: result.errorCode ? "error" : "ok",
    question: maskQuestion(question),
    tools: result.tools.map(({ args, status, tool }) => ({ args, status, tool })),
  };
  try {
    if (actor.guest) {
      await createAdminSupabaseClient()?.rpc("record_guest_agent_run", {
        p_duration_ms: fields.duration_ms,
        p_error_code: fields.error_code ?? "",
        p_model: fields.model,
        p_outcome: fields.outcome,
        p_question: fields.question,
        p_tools: fields.tools,
      });
      return;
    }
    await actor.supabase.from("agent_runs").insert({ ...fields, workspace_id: actor.workspaceId });
  } catch {
    // Sem log de conteúdo: a falha de registro não deve expor a pergunta.
  }
}
