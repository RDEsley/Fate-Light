import { createHmac } from "node:crypto";

import { AGENT_DAILY_CONTINUATIONS, AGENT_DAILY_MESSAGES } from "./config";

export type QuotaKind = "continuation" | "message";
export type QuotaResult = { allowed: boolean; remaining: number };

export const quotaExhaustedMessage =
  "Você usou as 10 mensagens de hoje. O assistente volta amanhã, e o resto do sistema segue normal.";
export const quotaUnavailableMessage =
  "Não consegui verificar seu limite de uso agora. Tente de novo em instantes.";

const limits: Record<QuotaKind, number> = {
  continuation: AGENT_DAILY_CONTINUATIONS,
  message: AGENT_DAILY_MESSAGES,
};

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/** O IP nunca é guardado em claro: só este HMAC, que muda junto com o sal. */
export function hashIp(ip: string, salt: string) {
  return createHmac("sha256", salt).update(ip).digest("hex");
}

/** Contador em memória, só para desenvolvimento e E2E, onde não há chave secreta do banco. */
export function createMemoryQuota(globalCap: number) {
  const usage = new Map<string, number>();
  const take = (key: string, limit: number) => {
    const used = usage.get(key) ?? 0;
    if (used >= limit) return false;
    usage.set(key, used + 1);
    return true;
  };

  return (scope: string, kind: QuotaKind): QuotaResult => {
    const day = new Date().toISOString().slice(0, 10);
    const key = `${day}:${scope}:${kind}`;
    const limit = limits[kind];
    if ((usage.get(key) ?? 0) >= limit || !take(`${day}:global`, globalCap)) {
      return { allowed: false, remaining: 0 };
    }
    take(key, limit);
    return { allowed: true, remaining: limit - (usage.get(key) ?? 0) };
  };
}
