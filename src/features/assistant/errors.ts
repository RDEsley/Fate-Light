import { APICallError, InvalidToolApprovalSignatureError, RetryError } from "ai";

export type AgentErrorCode =
  "invalid_approval" | "provider_auth" | "quota" | "timeout" | "tool_failed" | "unknown";

export const agentErrorMessages: Record<AgentErrorCode, string> = {
  invalid_approval: "Essa confirmação não é mais válida. Peça para o assistente propor de novo.",
  provider_auth: "O assistente está indisponível no momento. Nada foi alterado.",
  quota: "A cota gratuita de IA acabou por agora. Tente de novo mais tarde. Nada foi alterado.",
  timeout: "O assistente demorou demais para responder. Tente de novo. Nada foi alterado.",
  tool_failed: "Não consegui consultar esses dados agora. Tente de novo em instantes.",
  unknown: "Não consegui concluir o pedido. Tente de novo em instantes.",
};

/** Erro de tool com texto seguro: detalhes do banco nunca chegam ao modelo ou à tela. */
export class AssistantToolError extends Error {
  constructor() {
    super(agentErrorMessages.tool_failed);
    this.name = "AssistantToolError";
  }
}

function rootError(error: unknown): unknown {
  return RetryError.isInstance(error) ? error.lastError : error;
}

export function isQuotaError(error: unknown) {
  const root = rootError(error);
  if (!APICallError.isInstance(root)) return false;
  return root.statusCode === 429 || /RESOURCE_EXHAUSTED/i.test(root.responseBody ?? "");
}

export function classifyAgentError(error: unknown): AgentErrorCode {
  const root = rootError(error);
  if (InvalidToolApprovalSignatureError.isInstance(root)) return "invalid_approval";
  if (root instanceof AssistantToolError) return "tool_failed";
  if (isQuotaError(root)) return "quota";
  if (root instanceof Error && ["AbortError", "TimeoutError"].includes(root.name)) {
    return "timeout";
  }
  if (APICallError.isInstance(root) && [401, 403].includes(root.statusCode ?? 0)) {
    return "provider_auth";
  }
  return "unknown";
}
