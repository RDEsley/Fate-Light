import type { UIMessage } from "ai";

import { formatDatePtBr } from "@/features/mvp/format";

import type { AssistantToolName } from "./config";

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** Argumentos da tool em português, para a pessoa entender o que o agente pediu. */
export function describeToolArgs(name: AssistantToolName, input: unknown) {
  const args = record(input);
  if (name === "listarClientesEmAtraso") {
    const days = Number(args.maisDeDias);
    return Number.isFinite(days) && days > 0
      ? `Atraso de mais de ${days} dias`
      : "Todos os atrasos";
  }
  if (name === "resumirMes" && typeof args.mes === "string") {
    return `Mês: ${formatDatePtBr(`${args.mes}-01`).slice(3)}`;
  }
  if (name === "criarLembreteCobranca" && Array.isArray(args.cobrancaIds)) {
    const total = args.cobrancaIds.length;
    return `${total} ${total === 1 ? "cobrança" : "cobranças"}`;
  }
  return "Preparando os dados";
}

export function maskMoney(text: string) {
  return text.replace(/R\$\s?[\d.,]+/g, "R$ ••••");
}

/** A transport devolve o corpo da resposta como texto; só `message` é mostrado. */
export function friendlyChatError(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    const message = record(parsed).message;
    if (typeof message === "string" && message) return message;
  } catch {
    // Texto simples já é a mensagem amigável enviada pelo stream.
  }
  return raw && raw.length <= 200 ? raw : "Não consegui concluir o pedido. Tente de novo.";
}

export function simulatedReminders(messages: UIMessage[]) {
  const names = messages.flatMap((message) =>
    message.parts.flatMap((part) => {
      if (part.type !== "tool-criarLembreteCobranca" || part.state !== "output-available") {
        return [];
      }
      const data = record(record(part.output).dados);
      return data.simulado === true && Array.isArray(data.criados)
        ? data.criados.filter((name): name is string => typeof name === "string")
        : [];
    }),
  );
  return [...new Set(names)];
}
