import {
  convertToModelMessages,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage,
} from "ai";

import { AGENT_MAX_STEPS, AGENT_TIMEOUT_MS } from "./config";
import type { AssistantReader, AssistantWriter } from "./data";
import { agentErrorMessages, classifyAgentError, type AgentErrorCode } from "./errors";
import { buildSystemPrompt } from "./prompt";
import { createAssistantTools, createToolApproval, type ToolRun } from "./tools";

export type AssistantRunResult = {
  durationMs: number;
  errorCode: AgentErrorCode | null;
  tools: ToolRun[];
};

export type StreamAssistantInput = {
  approvalSecret: string | undefined;
  messages: UIMessage[];
  model: LanguageModel;
  onEnd?: (result: AssistantRunResult) => Promise<void> | void;
  reader: AssistantReader;
  signal?: AbortSignal;
  today: string;
  writer: AssistantWriter;
};

/** Loop do agente: passos limitados, escrita sob aprovação assinada e erro sempre amigável. */
export async function streamAssistant(input: StreamAssistantInput) {
  const startedAt = Date.now();
  const runs: ToolRun[] = [];
  let errorCode: AgentErrorCode | null = null;
  const observe = (run: ToolRun) => {
    runs.push(run);
    if (run.status === "error") errorCode ??= "tool_failed";
  };
  const tools = createAssistantTools(input.reader, input.writer, observe);

  const result = streamText({
    abortSignal: input.signal,
    experimental_toolApprovalSecret: input.approvalSecret,
    // Sem repetição automática: erro de cota vai direto ao fallback e não gasta a cota gratuita.
    maxRetries: 0,
    messages: await convertToModelMessages(input.messages, { tools }),
    model: input.model,
    stopWhen: isStepCount(AGENT_MAX_STEPS),
    system: buildSystemPrompt(input.today),
    timeout: AGENT_TIMEOUT_MS,
    toolApproval: createToolApproval(input.reader, input.approvalSecret, observe),
    tools,
  });

  return toUIMessageStream({
    onEnd: async () => {
      await input.onEnd?.({ durationMs: Date.now() - startedAt, errorCode, tools: runs });
    },
    onError: (error) => {
      const code = classifyAgentError(error);
      errorCode = code;
      return agentErrorMessages[code];
    },
    originalMessages: input.messages,
    stream: result.stream,
    tools,
  });
}
