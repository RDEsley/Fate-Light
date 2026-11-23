import type { UIMessage } from "ai";

import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";
import { centsToDisplay } from "@/features/mvp/money";

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
  return text.replace(/R\$[\s ]?[\d.,]+/g, "R$ ••••");
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

export type ApprovalRow = {
  cents: number;
  client: string;
  days: number;
  dueDate: string;
  value: string;
};

const approvalLine = /^(.+?): (R\$[\s ]?[\d.,]+), venceu em (\d{2}\/\d{2}\/\d{4}) \((\d+) dias?\)$/;

/**
 * O servidor escreve o motivo da aprovação em linhas fixas; aqui elas viram linhas de tabela.
 * Texto fora do formato é ignorado, e o cartão mostra o motivo bruto como alternativa.
 */
export function parseApprovalLines(reason: string): ApprovalRow[] {
  return reason.split("\n").flatMap((line) => {
    const match = approvalLine.exec(line.trim());
    if (!match) return [];
    const [, client = "", value = "", dueDate = "", days = "0"] = match;
    return [
      {
        cents: Number(value.replace(/\D/g, "")),
        client,
        days: Number(days),
        dueDate,
        value,
      },
    ];
  });
}

export function approvalTotal(rows: ApprovalRow[]) {
  return centsToDisplay(rows.reduce((sum, row) => sum + row.cents, 0));
}

/** Uma linha de resumo para o resultado de cada ferramenta, já com o dinheiro formatado. */
export function describeToolResult(name: AssistantToolName, output: unknown) {
  const data = record(record(output).dados);

  if (name === "listarClientesEmAtraso") {
    const clients = Array.isArray(data.clientes) ? data.clientes.length : 0;
    const charges = Number(data.totalCobrancas ?? 0);
    if (!charges) return "Nenhuma cobrança nesse critério";
    return `${clients} ${clients === 1 ? "cliente" : "clientes"} · ${charges} ${charges === 1 ? "cobrança" : "cobranças"}`;
  }
  if (name === "resumirMes") {
    const part = (key: string) => formatCurrency(String(record(data[key]).total ?? "0"));
    return `Recebido ${part("recebido")} · Pendente ${part("pendente")} · Vencido ${part("vencido")}`;
  }
  const created = Array.isArray(data.criados) ? data.criados.length : 0;
  const existing = Array.isArray(data.jaExistiam) ? data.jaExistiam.length : 0;
  if (!created && existing) return "Os lembretes já existiam";
  const noun = created === 1 ? "lembrete criado" : "lembretes criados";
  return `${created} ${noun}${data.simulado === true ? " (simulado)" : ""}`;
}

const waitingLabels = [
  "Entendendo sua pergunta…",
  "Consultando seus dados…",
  "Montando a resposta…",
];

const toolWaitingLabels: Record<AssistantToolName, string> = {
  criarLembreteCobranca: "Criando os lembretes…",
  listarClientesEmAtraso: "Buscando cobranças em atraso…",
  resumirMes: "Somando recebidos e pendentes…",
};

/** Texto do indicador de carregamento: específico da ferramenta quando há uma em andamento. */
export function loadingLabel(tool: AssistantToolName | null, tick: number) {
  if (tool) return toolWaitingLabels[tool];
  return waitingLabels[tick % waitingLabels.length] ?? waitingLabels[0] ?? "";
}
