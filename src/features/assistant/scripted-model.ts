import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";

type ScriptedStep =
  | { input: Record<string, unknown>; toolName: string; type: "tool" }
  | { text: string; type: "text" };

const usage = {
  inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: 0, total: 0 },
  outputTokens: { reasoning: undefined, text: 0, total: 0 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function overdueIds(value: unknown) {
  if (!isRecord(value) || !isRecord(value.dados) || !Array.isArray(value.dados.clientes)) return [];
  return value.dados.clientes.flatMap((client: unknown) =>
    isRecord(client) && Array.isArray(client.cobrancas)
      ? client.cobrancas.flatMap((charge: unknown) =>
          isRecord(charge) && typeof charge.id === "string" ? [charge.id] : [],
        )
      : [],
  );
}

/** Decide o próximo passo só pelo histórico, para os testes E2E não dependerem de rede. */
export function scriptedStep(prompt: LanguageModelV4CallOptions["prompt"]): ScriptedStep {
  const userText = prompt
    .filter((message) => message.role === "user")
    .flatMap((message) => message.content)
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ")
    .toLowerCase();
  const last = prompt.at(-1);

  if (last?.role === "tool") {
    const result = last.content.findLast((part) => part.type === "tool-result");
    if (result?.toolName === "criarLembreteCobranca") {
      return result.output.type === "execution-denied"
        ? { text: "Tudo bem, nenhum lembrete foi criado.", type: "text" }
        : { text: "Pronto, os lembretes foram criados.", type: "text" };
    }
    if (result?.toolName === "listarClientesEmAtraso" && result.output.type === "json") {
      const ids = overdueIds(result.output.value);
      if (userText.includes("lembrete") && ids.length) {
        return { input: { cobrancaIds: ids }, toolName: "criarLembreteCobranca", type: "tool" };
      }
      return { text: `Encontrei ${ids.length} cobranças em atraso.`, type: "text" };
    }
    return { text: "Resumo do mês pronto.", type: "text" };
  }
  if (/devendo|atraso|deve/.test(userText)) {
    return { input: { maisDeDias: 30 }, toolName: "listarClientesEmAtraso", type: "tool" };
  }
  return { text: "Posso consultar atrasos, resumir o mês e propor lembretes.", type: "text" };
}

function stepContent(step: ScriptedStep, id: string): LanguageModelV4Content {
  return step.type === "text"
    ? { text: step.text, type: "text" }
    : {
        input: JSON.stringify(step.input),
        toolCallId: id,
        toolName: step.toolName,
        type: "tool-call",
      };
}

/** Modelo determinístico para E2E local e no CI. A rota o recusa em produção. */
export function createScriptedModel(): LanguageModelV4 {
  let calls = 0;
  const finishReason = (step: ScriptedStep) => ({
    raw: undefined,
    unified: step.type === "tool" ? ("tool-calls" as const) : ("stop" as const),
  });

  return {
    doGenerate: async ({ prompt }) => {
      const step = scriptedStep(prompt);
      calls += 1;
      return {
        content: [stepContent(step, `scripted-${calls}`)],
        finishReason: finishReason(step),
        usage,
        warnings: [],
      };
    },
    doStream: async ({ prompt }) => {
      const step = scriptedStep(prompt);
      calls += 1;
      const id = `scripted-${calls}`;
      const parts: LanguageModelV4StreamPart[] = [{ type: "stream-start", warnings: [] }];
      if (step.type === "text") {
        parts.push(
          { id, type: "text-start" },
          { delta: step.text, id, type: "text-delta" },
          { id, type: "text-end" },
        );
      } else {
        parts.push({
          input: JSON.stringify(step.input),
          toolCallId: id,
          toolName: step.toolName,
          type: "tool-call",
        });
      }
      parts.push({ finishReason: finishReason(step), type: "finish", usage });
      return {
        stream: new ReadableStream({
          start(controller) {
            for (const part of parts) controller.enqueue(part);
            controller.close();
          },
        }),
      };
    },
    modelId: "scripted",
    provider: "scripted",
    specificationVersion: "v4",
    supportedUrls: {},
  };
}
