"use client";

import type { UIMessage } from "ai";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { pushToast } from "@/components/ui/toast-store";
import {
  assistantToolIcons,
  assistantToolLabels,
  type AssistantToolName,
} from "@/features/assistant/config";
import {
  feedbackReasons,
  type FeedbackValue,
  type MessageFeedback,
} from "@/features/assistant/history";
import { parseRichText, plainText, type Inline } from "@/features/assistant/rich-text";
import {
  approvalTotal,
  describeToolArgs,
  describeToolResult,
  loadingLabel,
  maskMoney,
  parseApprovalLines,
} from "@/features/assistant/view";

import { AssistantMark } from "./assistant-mark";

export type MessagePart = UIMessage["parts"][number];
export type ToolPart = Extract<MessagePart, { toolCallId: string }> & {
  approval?: {
    approved?: boolean;
    id: string;
    isAutomatic?: boolean;
    reason?: string;
    requestReason?: string;
  };
  errorText?: string;
  input?: unknown;
  output?: unknown;
  state: string;
};
export type ApprovalResponse = (response: { approved: boolean; id: string }) => void;

const runningStates = new Set(["input-available", "input-streaming", "approval-responded"]);

export function isToolPart(part: MessagePart): part is ToolPart {
  return part.type.startsWith("tool-") && "toolCallId" in part;
}

export function toolNameOf(part: ToolPart) {
  return part.type.slice("tool-".length) as AssistantToolName;
}

/** Ferramenta ainda em andamento na última mensagem: o indicador de carregamento a nomeia. */
export function activeToolOf(message: UIMessage | undefined) {
  if (message?.role !== "assistant") return null;
  const last = message.parts.at(-1);
  return last && isToolPart(last) && runningStates.has(last.state) ? toolNameOf(last) : null;
}

export function hasPendingApproval(message: UIMessage | undefined) {
  if (message?.role !== "assistant") return false;
  return message.parts.some((part) => isToolPart(part) && part.state === "approval-requested");
}

export function messageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim();
}

function InlineText({ hideMoney, parts }: { hideMoney: boolean; parts: Inline[] }) {
  return parts.map((part, index) => {
    const text = hideMoney ? maskMoney(part.text) : part.text;
    if (part.type === "bold") return <strong key={index}>{text}</strong>;
    if (part.type === "code") return <code key={index}>{text}</code>;
    return text;
  });
}

/** Texto do modelo com parágrafos, listas e negrito; nunca HTML bruto. */
export function FormattedText({
  hideMoney,
  streaming = false,
  text,
}: {
  hideMoney: boolean;
  streaming?: boolean;
  text: string;
}) {
  const blocks = parseRichText(text);

  return (
    <div className="assistant-prose">
      {blocks.map((block, index) => {
        const isLast = index === blocks.length - 1;
        const caret =
          streaming && isLast ? <span aria-hidden="true" className="assistant-caret" /> : null;
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineText hideMoney={hideMoney} parts={item} />
                  {caret && itemIndex === block.items.length - 1 ? caret : null}
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            <InlineText hideMoney={hideMoney} parts={block.inline} />
            {caret}
          </p>
        );
      })}
      {!blocks.length && streaming ? <span aria-hidden="true" className="assistant-caret" /> : null}
    </div>
  );
}

/** Pontos que pulam e uma frase que acompanha o que o agente está fazendo. */
export function ThinkingIndicator({ tool }: { tool: AssistantToolName | null }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 2400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div aria-live="polite" className="assistant-row" role="status">
      <AssistantMark className="assistant-row__avatar" live size="xs" />
      <div className="assistant-thinking">
        <span aria-hidden="true" className="assistant-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="assistant-thinking__label">{loadingLabel(tool, tick)}</span>
      </div>
    </div>
  );
}

function statusOf(state: string) {
  if (state === "output-available") return { icon: "check-circle", label: "Concluído", tone: "ok" };
  if (state === "output-error") return { icon: "alert-circle", label: "Falhou", tone: "error" };
  if (state === "output-denied") return { icon: "x", label: "Cancelado", tone: "muted" };
  if (state === "approval-requested")
    return { icon: "bell", label: "Aguardando você", tone: "wait" };
  return { icon: "refresh", label: "Executando", tone: "run" };
}

function ApprovalCard({
  guest,
  hideMoney,
  onRespond,
  part,
}: {
  guest: boolean;
  hideMoney: boolean;
  onRespond: ApprovalResponse;
  part: ToolPart;
}) {
  const approval = part.approval;
  if (!approval) return null;

  const reason = approval.requestReason ?? "";
  const rows = parseApprovalLines(reason);
  const money = (value: string) => (hideMoney ? "R$ ••••" : value);

  return (
    <div
      className="assistant-approval"
      role="group"
      aria-labelledby={`approval-${part.toolCallId}`}
    >
      <p className="assistant-approval__title" id={`approval-${part.toolCallId}`}>
        {rows.length === 1
          ? "Criar 1 lembrete?"
          : rows.length > 1
            ? `Criar ${rows.length} lembretes?`
            : "Criar os lembretes?"}
      </p>
      {rows.length ? (
        <ul className="assistant-approval__list">
          {rows.map((row) => (
            <li key={`${row.client}-${row.dueDate}-${row.cents}`}>
              <span className="assistant-approval__who">
                <strong>{row.client}</strong>
                <small>
                  Venceu em {row.dueDate} · {row.days} {row.days === 1 ? "dia" : "dias"} de atraso
                </small>
              </span>
              <span className="assistant-approval__amount">{money(row.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="assistant-approval__raw">{hideMoney ? maskMoney(reason) : reason}</p>
      )}
      {rows.length > 1 ? (
        <p className="assistant-approval__total">
          <span>Total em atraso</span>
          <strong>{money(approvalTotal(rows))}</strong>
        </p>
      ) : null}
      <p className="assistant-approval__note">
        <Icon className="size-3.5 shrink-0" name="info" />
        {guest
          ? "Demonstração: nada será gravado e nenhuma mensagem sai do sistema."
          : "O lembrete fica só no Fate Light. Nada é enviado ao cliente."}
      </p>
      <div className="assistant-approval__actions">
        <button
          className="button button--primary button--small"
          onClick={() => onRespond({ approved: true, id: approval.id })}
          type="button"
        >
          <Icon className="size-4" name="check" /> Aprovar
        </button>
        <button
          className="button button--secondary button--small"
          onClick={() => onRespond({ approved: false, id: approval.id })}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ToolStep({
  guest,
  hideMoney,
  onRespond,
  part,
}: {
  guest: boolean;
  hideMoney: boolean;
  onRespond: ApprovalResponse;
  part: ToolPart;
}) {
  const name = toolNameOf(part);
  const status = statusOf(part.state);
  const awaiting =
    part.state === "approval-requested" && part.approval && !part.approval.isAutomatic;
  const result = part.state === "output-available" ? describeToolResult(name, part.output) : null;

  return (
    <div className={`assistant-step assistant-step--${status.tone}`}>
      <div className="assistant-step__head">
        <span className="assistant-step__icon">
          <Icon className="size-4" name={assistantToolIcons[name] ?? "sparkles"} />
        </span>
        <span className="assistant-step__text">
          <strong>{assistantToolLabels[name] ?? name}</strong>
          <small>{describeToolArgs(name, part.input)}</small>
        </span>
        <span className="assistant-step__badge">
          <Icon className="size-3.5" name={status.icon as "check"} />
          {status.label}
        </span>
      </div>
      {result ? (
        <p className="assistant-step__result">{hideMoney ? maskMoney(result) : result}</p>
      ) : null}
      {part.state === "output-error" ? (
        <p className="assistant-step__error">{part.errorText}</p>
      ) : null}
      {awaiting ? (
        <ApprovalCard guest={guest} hideMoney={hideMoney} onRespond={onRespond} part={part} />
      ) : null}
    </div>
  );
}

/** Copiar, curtir e descurtir: o mesmo gesto simples dos assistentes de conversa. */
export function MessageActions({
  feedback,
  isLast,
  onFeedback,
  onRetry,
  text,
}: {
  feedback: MessageFeedback | undefined;
  isLast: boolean;
  onFeedback: (value: FeedbackValue | null, reason?: string) => void;
  onRetry: () => void;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText(text));
      setCopied(true);
    } catch {
      pushToast({
        message: "Não consegui copiar. Selecione o texto e copie manualmente.",
        tone: "error",
      });
    }
  };

  const rate = (value: FeedbackValue) => {
    if (feedback?.value === value) {
      onFeedback(null);
      return;
    }
    onFeedback(value);
    if (value === "up") pushToast({ message: "Que bom! Obrigado pelo feedback.", tone: "success" });
  };

  return (
    <div className="assistant-actions-wrap">
      <div className="assistant-actions" role="group" aria-label="Ações da resposta">
        <button
          aria-label={copied ? "Resposta copiada" : "Copiar resposta"}
          className="assistant-action"
          onClick={() => void copy()}
          title="Copiar"
          type="button"
        >
          <Icon className="size-4" name={copied ? "check" : "copy"} />
        </button>
        <button
          aria-label="Gostei da resposta"
          aria-pressed={feedback?.value === "up"}
          className="assistant-action"
          onClick={() => rate("up")}
          title="Gostei"
          type="button"
        >
          <Icon className="size-4" name="thumbs-up" />
        </button>
        <button
          aria-label="Não gostei da resposta"
          aria-pressed={feedback?.value === "down"}
          className="assistant-action"
          onClick={() => rate("down")}
          title="Não gostei"
          type="button"
        >
          <Icon className="size-4" name="thumbs-down" />
        </button>
        {isLast ? (
          <button
            aria-label="Gerar a resposta de novo"
            className="assistant-action"
            onClick={onRetry}
            title="Tentar de novo"
            type="button"
          >
            <Icon className="size-4" name="refresh" />
          </button>
        ) : null}
      </div>
      {feedback?.value === "down" ? (
        <div className="assistant-reasons" role="group" aria-label="O que não ficou bom?">
          <span>O que não ficou bom?</span>
          {feedbackReasons.map((reason) => (
            <button
              aria-pressed={feedback.reason === reason}
              className="assistant-chip"
              key={reason}
              onClick={() => onFeedback("down", feedback.reason === reason ? undefined : reason)}
              type="button"
            >
              {reason}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
