"use client";

import { Chat, useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ui/icon";
import { assistantToolLabels, type AssistantToolName } from "@/features/assistant/config";
import {
  describeToolArgs,
  friendlyChatError,
  maskMoney,
  simulatedReminders,
} from "@/features/assistant/view";

type Status = "consent_required" | "loading" | "ready" | "real_data_disabled" | "unavailable";
type MessagePart = UIMessage["parts"][number];
type ToolPart = Extract<MessagePart, { toolCallId: string }> & {
  approval?: {
    approved?: boolean;
    id: string;
    isAutomatic?: boolean;
    reason?: string;
    requestReason?: string;
  };
  errorText?: string;
  input?: unknown;
  state: string;
};
type ApprovalResponse = (response: { approved: boolean; id: string }) => void;

const suggestions = [
  "Quem está me devendo há mais de 30 dias? Cria um lembrete pra cada um",
  "Como está o resumo deste mês?",
];
const demoRemindersKey = "fate-light:assistant-demo-reminders";
const privacyKey = "fate-light:hide-financial-values";

// O AppFrame remonta a cada página: a conversa fica fora dele para não sumir ao navegar.
const chats = new Map<string, Chat<UIMessage>>();

function chatFor(key: string) {
  const existing = chats.get(key);
  if (existing) return existing;
  const chat = new Chat<UIMessage>({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  chats.set(key, chat);
  return chat;
}

function isToolPart(part: MessagePart): part is ToolPart {
  return part.type.startsWith("tool-") && "toolCallId" in part;
}

function toolName(part: ToolPart) {
  return part.type.slice("tool-".length) as AssistantToolName;
}

function stepStatus(state: string) {
  if (state === "output-available") return { label: "Concluído", tone: "text-positive" };
  if (state === "output-error") return { label: "Falhou", tone: "text-negative" };
  if (state === "output-denied") return { label: "Cancelado", tone: "text-muted" };
  if (state === "approval-requested") return { label: "Aguardando você", tone: "text-warning" };
  return { label: "Executando", tone: "text-muted" };
}

function ToolStep({
  hideMoney,
  onRespond,
  part,
}: {
  hideMoney: boolean;
  onRespond: ApprovalResponse;
  part: ToolPart;
}) {
  const name = toolName(part);
  const status = stepStatus(part.state);
  const approval = part.approval;
  const awaiting = part.state === "approval-requested" && approval && !approval.isAutomatic;

  return (
    <div className="border-line rounded-xl border-2 bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 font-black">
          <Icon className="text-brand-strong size-4 shrink-0" name="sparkles" />
          {assistantToolLabels[name] ?? name}
        </span>
        <span className={`shrink-0 text-xs font-bold ${status.tone}`}>{status.label}</span>
      </div>
      <p className="text-muted mt-1 text-xs">{describeToolArgs(name, part.input)}</p>

      {awaiting ? (
        <div className="bg-warning-soft mt-3 rounded-lg p-3">
          <p className="font-black">Confirma a criação destes lembretes?</p>
          <p className="mt-1 text-xs leading-5 whitespace-pre-line">
            {hideMoney ? maskMoney(approval.requestReason ?? "") : approval.requestReason}
          </p>
          <p className="text-muted mt-2 text-xs">
            Fica só no Fate Light. Nada é enviado ao cliente.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="button button--primary button--small"
              onClick={() => onRespond({ approved: true, id: approval.id })}
              type="button"
            >
              Aprovar
            </button>
            <button
              className="button button--ghost button--small"
              onClick={() => onRespond({ approved: false, id: approval.id })}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {part.state === "output-error" ? (
        <p className="text-negative mt-2 text-xs">{part.errorText}</p>
      ) : null}
    </div>
  );
}

function AssistantChat({ chatKey, guest }: { chatKey: string; guest: boolean }) {
  const { addToolApprovalResponse, error, messages, sendMessage, status } = useChat({
    chat: chatFor(chatKey),
  });
  const [draft, setDraft] = useState("");
  const [hideMoney, setHideMoney] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    inputRef.current?.focus();
    const timeout = window.setTimeout(() => {
      try {
        setHideMoney(window.localStorage.getItem(privacyKey) === "on");
      } catch {
        setHideMoney(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (!guest) return;
    const names = simulatedReminders(messages);
    if (!names.length) return;
    try {
      window.sessionStorage.setItem(demoRemindersKey, JSON.stringify(names));
    } catch {
      // Sem armazenamento, a simulação continua visível na conversa.
    }
  }, [guest, messages]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setDraft("");
    void sendMessage({ text: question });
  };

  return (
    <>
      <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
        {!messages.length ? (
          <div className="space-y-2">
            <p className="text-muted text-sm">
              Pergunte sobre cobranças e o mês. Antes de criar algo, eu peço sua confirmação.
            </p>
            {suggestions.map((suggestion) => (
              <button
                className="border-line hover:bg-brand-soft w-full rounded-xl border-2 bg-white p-3 text-left text-sm font-bold"
                key={suggestion}
                onClick={() => send(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((message) => (
          <div className="space-y-2" key={message.id}>
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                const text = hideMoney ? maskMoney(part.text) : part.text;
                return (
                  <p
                    className={`rounded-xl p-3 text-sm leading-6 whitespace-pre-wrap ${message.role === "user" ? "bg-brand-soft ml-8" : "mr-4 bg-white"}`}
                    key={`${message.id}-${index}`}
                  >
                    {text}
                  </p>
                );
              }
              if (!isToolPart(part)) return null;
              return (
                <ToolStep
                  hideMoney={hideMoney}
                  key={part.toolCallId}
                  onRespond={addToolApprovalResponse}
                  part={part}
                />
              );
            })}
          </div>
        ))}
        {guest && simulatedReminders(messages).length ? (
          <p className="bg-brand-soft rounded-xl p-3 text-xs font-bold">
            Demonstração: {simulatedReminders(messages).length} lembrete(s) simulado(s) nesta
            sessão. Nada foi gravado.
          </p>
        ) : null}
        {busy ? <p className="text-muted text-xs">Pensando...</p> : null}
        {error ? (
          <p className="bg-negative-soft text-negative rounded-xl p-3 text-sm" role="alert">
            {friendlyChatError(error.message)}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-line border-t p-3">
        <label className="text-xs font-black" htmlFor="assistant-question">
          Sua pergunta
        </label>
        <div className="mt-1 flex items-end gap-2">
          <textarea
            className="max-h-28 min-h-11 flex-1 resize-none rounded-xl p-2.5 text-sm"
            id="assistant-question"
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            ref={inputRef}
            rows={1}
            value={draft}
          />
          <button
            className="button button--primary button--small"
            disabled={busy || !draft.trim()}
            onClick={() => send(draft)}
            type="button"
          >
            Enviar
          </button>
        </div>
      </div>
    </>
  );
}

function ConsentNotice({ onAccepted }: { onAccepted: () => void }) {
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const accept = async () => {
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch("/api/agent/consent", { method: "POST" });
      if (!response.ok) throw new Error("consent");
      onAccepted();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 text-sm leading-6">
      <p className="font-black">Antes de usar com seus dados</p>
      <p>
        Para responder, o assistente envia ao Google (Gemini) e, se ele falhar, à Groq o nome do
        cliente, a descrição, o valor e o vencimento das cobranças consultadas.
      </p>
      <p>
        No plano gratuito, esses provedores podem usar o conteúdo para melhorar seus produtos. CPF,
        CNPJ, telefone, e-mail, endereço, observações e arquivos nunca são enviados.
      </p>
      {failed ? (
        <p className="text-negative" role="alert">
          Não consegui registrar o aceite. Tente de novo.
        </p>
      ) : null}
      <button
        className="button button--primary button--small"
        disabled={saving}
        onClick={() => void accept()}
        type="button"
      >
        Entendi e aceito
      </button>
    </div>
  );
}

export function AssistantPanel({
  guest,
  workspaceName,
}: {
  guest: boolean;
  workspaceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/agent", { cache: "no-store" });
      const body: { status?: Status } = await response.json();
      setStatus(response.ok && body.status ? body.status : "unavailable");
    } catch {
      setStatus("unavailable");
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Abrir assistente"
        className="cartoon-card grid size-10 place-items-center"
        onClick={() => {
          setOpen(true);
          void loadStatus();
        }}
        ref={triggerRef}
        title="Assistente"
        type="button"
      >
        <Icon name="sparkles" />
      </button>
      {open
        ? createPortal(
            <section
              aria-label="Assistente"
              className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l-2 border-slate-700/15 bg-[#fdfcf7] shadow-2xl"
              role="dialog"
            >
              <header className="border-line flex items-center justify-between gap-2 border-b p-4">
                <div>
                  <h2 className="font-black">Assistente</h2>
                  <p className="text-muted text-xs">
                    {guest
                      ? "Modo demonstração, dados fictícios"
                      : "Só lê seus dados e pede confirmação"}
                  </p>
                </div>
                <button
                  aria-label="Fechar assistente"
                  className="hover:bg-brand-soft grid size-10 place-items-center rounded-xl"
                  onClick={close}
                  type="button"
                >
                  <Icon name="x" />
                </button>
              </header>
              {status === "loading" ? (
                <p className="text-muted p-4 text-sm">Carregando...</p>
              ) : null}
              {status === "unavailable" ? (
                <p className="p-4 text-sm leading-6">
                  O assistente ainda não foi configurado neste ambiente. O resto do sistema segue
                  normal.
                </p>
              ) : null}
              {status === "real_data_disabled" ? (
                <p className="p-4 text-sm leading-6">
                  Por enquanto o assistente funciona só no modo visitante, com dados fictícios. Seus
                  dados não são enviados a nenhum provedor de IA.
                </p>
              ) : null}
              {status === "consent_required" ? (
                <ConsentNotice onAccepted={() => setStatus("ready")} />
              ) : null}
              {status === "ready" ? (
                <AssistantChat
                  chatKey={`${guest ? "guest" : "account"}:${workspaceName}`}
                  guest={guest}
                />
              ) : null}
            </section>,
            document.body,
          )
        : null}
    </>
  );
}
