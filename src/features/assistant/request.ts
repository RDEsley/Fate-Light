import { safeValidateUIMessages, type UIMessage } from "ai";
import { z } from "zod";

import { AGENT_MAX_BODY_BYTES, AGENT_MAX_MESSAGES, AGENT_MAX_QUESTION_CHARS } from "./config";
import type { AssistantTools } from "./tools";

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(AGENT_MAX_MESSAGES),
});

export type AssistantRequest = {
  kind: "continuation" | "message";
  messages: UIMessage[];
  question: string;
};

export function lastUserText(messages: UIMessage[]) {
  const message = messages.findLast((item) => item.role === "user");
  return (message?.parts ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .trim();
}

/** O histórico vem do navegador: tamanho, formato e papéis são conferidos antes do modelo. */
export async function parseAssistantRequest(
  raw: string,
  tools: AssistantTools,
): Promise<AssistantRequest | null> {
  if (new TextEncoder().encode(raw).length > AGENT_MAX_BODY_BYTES) return null;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const body = bodySchema.safeParse(json);
  if (!body.success) return null;

  const validated = await safeValidateUIMessages({ messages: body.data.messages, tools });
  if (!validated.success) return null;

  const messages: UIMessage[] = validated.data;
  if (messages.some((message) => message.role === "system")) return null;

  const last = messages.at(-1);
  const question = lastUserText(messages);
  if (!last || !question || question.length > AGENT_MAX_QUESTION_CHARS) return null;
  return { kind: last.role === "user" ? "message" : "continuation", messages, question };
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
