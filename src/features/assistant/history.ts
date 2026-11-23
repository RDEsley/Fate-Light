import type { UIMessage } from "ai";

import { AGENT_MAX_MESSAGES } from "./config";

export type FeedbackValue = "down" | "up";
export type MessageFeedback = { reason?: string; value: FeedbackValue };
export type FeedbackMap = Record<string, MessageFeedback>;

export type StoredConversation = {
  feedback: FeedbackMap;
  id: string;
  messages: UIMessage[];
  title: string;
  updatedAt: number;
};

export const MAX_CONVERSATIONS = 20;
/** O servidor aceita até AGENT_MAX_MESSAGES: a conversa para um passo antes. */
export const MAX_CHAT_MESSAGES = AGENT_MAX_MESSAGES - 1;
export const LONG_CHAT_MESSAGES = MAX_CHAT_MESSAGES - 5;

const storagePrefix = "fate-light:assistant:v1:";
const finalToolStates = new Set(["output-available", "output-denied", "output-error"]);

export const feedbackReasons = ["Incorreto", "Incompleto", "Confuso"] as const;

function isMessage(value: unknown): value is UIMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Partial<UIMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    Array.isArray(message.parts)
  );
}

function isFeedback(value: unknown): value is MessageFeedback {
  if (typeof value !== "object" || value === null) return false;
  const feedback = value as Partial<MessageFeedback>;
  return (
    (feedback.value === "up" || feedback.value === "down") &&
    (feedback.reason === undefined || typeof feedback.reason === "string")
  );
}

function toConversation(value: unknown): StoredConversation | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Partial<StoredConversation>;
  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.updatedAt !== "number" ||
    !Array.isArray(item.messages) ||
    !item.messages.every(isMessage)
  ) {
    return null;
  }
  const feedback: FeedbackMap = {};
  if (typeof item.feedback === "object" && item.feedback !== null) {
    for (const [key, entry] of Object.entries(item.feedback)) {
      if (isFeedback(entry)) feedback[key] = entry;
    }
  }
  return {
    feedback,
    id: item.id,
    messages: item.messages,
    title: item.title,
    updatedAt: item.updatedAt,
  };
}

function textOf(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Uma conversa só é guardada em estado final: sem aprovação pendente, sem ferramenta em
 * andamento e terminando em uma resposta. Assim, reabrir nunca expõe um cartão de aprovação
 * antigo nem uma resposta cortada no meio.
 */
export function sanitizeForStorage(messages: UIMessage[]) {
  const kept = [...messages];
  const isComplete = (message: UIMessage) =>
    message.role === "assistant" &&
    message.parts.some((part) => part.type === "text" && part.text.trim()) &&
    message.parts.every(
      (part) =>
        !part.type.startsWith("tool-") ||
        !("state" in part) ||
        finalToolStates.has(String(part.state)),
    );

  while (kept.length && !isComplete(kept[kept.length - 1] as UIMessage)) kept.pop();
  return kept;
}

export function deriveTitle(messages: UIMessage[]) {
  const first = messages.find((message) => message.role === "user");
  const text = first ? textOf(first) : "";
  if (!text) return "Nova conversa";
  return text.length > 56 ? `${text.slice(0, 55).trimEnd()}…` : text;
}

export function previewOf(messages: UIMessage[]) {
  const last = [...messages].reverse().find((message) => message.role === "assistant");
  const text = last ? textOf(last).replace(/\*\*|`/g, "") : "";
  return text.length > 90 ? `${text.slice(0, 89).trimEnd()}…` : text;
}

export function upsertConversation(list: StoredConversation[], next: StoredConversation) {
  return [next, ...list.filter((item) => item.id !== next.id)]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_CONVERSATIONS);
}

export function removeConversation(list: StoredConversation[], id: string) {
  return list.filter((item) => item.id !== id);
}

export function readConversations(storage: Storage | null, scope: string) {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(storagePrefix + scope) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(toConversation)
      .filter((item): item is StoredConversation => item !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
}

/** Se o navegador recusar por falta de espaço, descarta as mais antigas até caber. */
export function writeConversations(
  storage: Storage | null,
  scope: string,
  list: StoredConversation[],
) {
  if (!storage) return;
  let items = list;
  while (true) {
    try {
      if (items.length) storage.setItem(storagePrefix + scope, JSON.stringify(items));
      else storage.removeItem(storagePrefix + scope);
      return;
    } catch {
      if (items.length <= 1) return;
      items = items.slice(0, Math.ceil(items.length / 2));
    }
  }
}

/** Sair da conta apaga o histórico guardado neste navegador, de qualquer escopo. */
export function clearAssistantStorage(storage: Storage | null) {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(storagePrefix)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Sem acesso ao armazenamento, não há histórico a apagar.
  }
}

export function formatRelative(timestamp: number, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return "agora";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const date = new Date(timestamp);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function groupByDay(list: StoredConversation[], now = Date.now()) {
  const startOfDay = (value: number) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  const groups: { items: StoredConversation[]; label: string }[] = [];

  for (const item of list) {
    const day = startOfDay(item.updatedAt);
    const label = day >= today ? "Hoje" : day >= yesterday ? "Ontem" : "Anteriores";
    const group = groups.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else groups.push({ items: [item], label });
  }
  return groups;
}
