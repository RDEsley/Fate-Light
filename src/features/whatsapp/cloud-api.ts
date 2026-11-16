import { createHmac, timingSafeEqual } from "node:crypto";

import { buildTemplateRequest, type ReminderMessage } from "./template";

const graphApiVersion = "v23.0";

export type SendResult = { messageId: string; ok: true } | { error: string; ok: false };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

function describeError(payload: unknown, status: number) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: { code?: number; message?: string } }).error;
    if (error?.message) return `Meta ${error.code ?? status}: ${error.message}`.slice(0, 500);
  }
  return `Meta respondeu ${status}.`;
}

/** Envia um template. Nunca lança: falha de rede vira resultado para o histórico. */
export async function sendTemplateMessage(
  input: { accessToken: string; message: ReminderMessage; phoneNumberId: string },
  fetchImpl: FetchLike = fetch,
): Promise<SendResult> {
  try {
    const response = await fetchImpl(
      `https://graph.facebook.com/${graphApiVersion}/${input.phoneNumberId}/messages`,
      {
        body: JSON.stringify(buildTemplateRequest(input.message)),
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    const messageId =
      typeof payload === "object" && payload !== null && "messages" in payload
        ? (payload as { messages?: Array<{ id?: string }> }).messages?.[0]?.id
        : undefined;

    if (response.ok && messageId) return { messageId, ok: true };
    return { error: describeError(payload, response.status), ok: false };
  } catch {
    return { error: "Falha de conexão com a Meta.", ok: false };
  }
}

/** Confere `X-Hub-Signature-256` (HMAC-SHA256 do corpo bruto com o app secret). */
export function isValidWebhookSignature(rawBody: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = header.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
}

export type WebhookStatus = {
  error: string | null;
  messageId: string;
  status: "delivered" | "failed" | "read" | "sent";
};

const knownStatuses = new Set(["sent", "delivered", "read", "failed"]);

/** Extrai os status de mensagens do payload do webhook, ignorando o que não for status. */
export function parseWebhookStatuses(payload: unknown): WebhookStatus[] {
  const statuses: WebhookStatus[] = [];
  const entries = (payload as { entry?: unknown[] } | null)?.entry;
  if (!Array.isArray(entries)) return statuses;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const items = (change as { value?: { statuses?: unknown[] } }).value?.statuses;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const status = item as {
          errors?: Array<{ message?: string; title?: string }>;
          id?: unknown;
          status?: unknown;
        };
        if (typeof status.id !== "string" || typeof status.status !== "string") continue;
        if (!knownStatuses.has(status.status)) continue;
        const firstError = status.errors?.[0];
        statuses.push({
          error: firstError ? (firstError.message ?? firstError.title ?? null) : null,
          messageId: status.id,
          status: status.status as WebhookStatus["status"],
        });
      }
    }
  }
  return statuses;
}
