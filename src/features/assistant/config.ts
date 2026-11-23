export const AGENT_MAX_STEPS = 5;
export const AGENT_TIMEOUT_MS = 45_000;
export const AGENT_MAX_REMINDERS = 20;
export const AGENT_MAX_MESSAGES = 30;
export const AGENT_MAX_BODY_BYTES = 128_000;
export const AGENT_MAX_QUESTION_CHARS = 1_000;
export const AGENT_DAILY_MESSAGES = 10;
export const AGENT_DAILY_CONTINUATIONS = 20;
export const AGENT_DEFAULT_GUEST_CAP = 30;
export const AGENT_CONSENT_VERSION = "2026-11-v1";

export const assistantToolLabels = {
  criarLembreteCobranca: "Criar lembretes de cobrança",
  listarClientesEmAtraso: "Listar clientes em atraso",
  resumirMes: "Resumir o mês",
} as const;

export const assistantToolIcons = {
  criarLembreteCobranca: "bell",
  listarClientesEmAtraso: "users",
  resumirMes: "wallet",
} as const;

export type AssistantToolName = keyof typeof assistantToolLabels;
