"use client";

import { useChat, type Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  LONG_CHAT_MESSAGES,
  MAX_CHAT_MESSAGES,
  type FeedbackMap,
  type FeedbackValue,
} from "@/features/assistant/history";
import { friendlyChatError, simulatedReminders } from "@/features/assistant/view";

import { AssistantMark } from "./assistant-mark";
import {
  FormattedText,
  MessageActions,
  ThinkingIndicator,
  ToolStep,
  activeToolOf,
  hasPendingApproval,
  isToolPart,
  messageText,
} from "./assistant-messages";

const privacyKey = "fate-light:hide-financial-values";

const suggestions = [
  {
    icon: "users",
    text: "Quem está me devendo há mais de 30 dias? Cria um lembrete pra cada um",
    title: "Cobranças em atraso",
  },
  { icon: "wallet", text: "Como está o resumo deste mês?", title: "Resumo do mês" },
  { icon: "calendar", text: "Quanto recebi no mês passado?", title: "Mês passado" },
] as const;

function readHideMoney() {
  try {
    return window.localStorage.getItem(privacyKey) === "on";
  } catch {
    return false;
  }
}

export function AssistantConversation({
  chat,
  conversationId,
  firstName,
  guest,
  initialFeedback,
  onBusyChange,
  onNewChat,
  onPersist,
}: {
  chat: Chat<UIMessage>;
  conversationId: string;
  firstName: string;
  guest: boolean;
  initialFeedback: FeedbackMap;
  onBusyChange: (busy: boolean) => void;
  onNewChat: () => void;
  /** O id vai junto: a conversa ativa muda no pai e o filho nunca grava na errada. */
  onPersist: (id: string, messages: UIMessage[], feedback: FeedbackMap) => void;
}) {
  const {
    addToolApprovalResponse,
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    status,
    stop,
  } = useChat({ chat });
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<FeedbackMap>(initialFeedback);
  const [hideMoney, setHideMoney] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const pending = hasPendingApproval(messages.at(-1));
  const tooLong = messages.length >= MAX_CHAT_MESSAGES;
  const lastMessage = messages.at(-1);
  const lastIsAssistant = lastMessage?.role === "assistant";
  const showThinking =
    status === "submitted" ||
    (status === "streaming" && (!lastIsAssistant || !lastMessage.parts.length)) ||
    (busy && activeToolOf(lastMessage) !== null);

  useEffect(() => {
    const timer = window.setTimeout(() => setHideMoney(readHideMoney()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

  useEffect(() => {
    if (!busy) onPersist(conversationId, messages, feedback);
  }, [busy, conversationId, feedback, messages, onPersist]);

  useEffect(() => {
    const thread = threadRef.current;
    // A rolagem suave vem do CSS (`scroll-behavior`), que também respeita o movimento reduzido.
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
  }, [draft]);

  useEffect(() => {
    if (!busy && !pending) inputRef.current?.focus();
  }, [busy, pending]);

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || busy || pending || tooLong) return;
      setDraft("");
      clearError();
      void sendMessage({ text: question });
    },
    [busy, clearError, pending, sendMessage, tooLong],
  );

  const rate = (messageId: string, value: FeedbackValue | null, reason?: string) =>
    setFeedback((current) => {
      const next = { ...current };
      if (value === null) delete next[messageId];
      else next[messageId] = reason ? { reason, value } : { value };
      return next;
    });

  const reminders = guest ? simulatedReminders(messages) : [];
  const canSend = Boolean(draft.trim()) && !busy && !pending && !tooLong;

  return (
    <>
      <div
        aria-label="Conversa com o assistente"
        className="assistant-thread"
        ref={threadRef}
        role="log"
      >
        {!messages.length ? (
          <div className="assistant-welcome">
            <AssistantMark live size="lg" />
            <h3>Olá, {firstName}!</h3>
            <p>
              Sou o assistente do Fate Light. Consulto suas cobranças e, antes de criar qualquer
              coisa, peço a sua confirmação.
            </p>
            <div className="assistant-suggestions">
              {suggestions.map((item) => (
                <button key={item.title} onClick={() => send(item.text)} type="button">
                  <span className="assistant-suggestions__icon">
                    <Icon className="size-4" name={item.icon} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </span>
                  <Icon className="assistant-suggestions__arrow size-4" name="chevron-right" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const streamingThis = busy && isLast && message.role === "assistant";

          if (message.role === "user") {
            return (
              <div className="assistant-row assistant-row--user" key={message.id}>
                <p className="assistant-bubble assistant-bubble--user">{messageText(message)}</p>
              </div>
            );
          }

          const text = messageText(message);
          const showActions = Boolean(text) && !streamingThis && !hasPendingApproval(message);
          return (
            <div className="assistant-row" key={message.id}>
              <AssistantMark className="assistant-row__avatar" size="xs" />
              <div className="assistant-row__body">
                {message.parts.map((part, partIndex) => {
                  if (part.type === "text") {
                    if (!part.text.trim()) return null;
                    const lastText =
                      message.parts.findLastIndex((item) => item.type === "text") === partIndex;
                    return (
                      <div className="assistant-bubble" key={`${message.id}-${partIndex}`}>
                        <FormattedText
                          hideMoney={hideMoney}
                          streaming={
                            streamingThis && lastText && partIndex === message.parts.length - 1
                          }
                          text={part.text}
                        />
                      </div>
                    );
                  }
                  if (!isToolPart(part)) return null;
                  return (
                    <ToolStep
                      guest={guest}
                      hideMoney={hideMoney}
                      key={part.toolCallId}
                      onRespond={addToolApprovalResponse}
                      part={part}
                    />
                  );
                })}
                {showActions ? (
                  <MessageActions
                    feedback={feedback[message.id]}
                    isLast={isLast}
                    onFeedback={(value, reason) => rate(message.id, value, reason)}
                    onRetry={() => void regenerate()}
                    text={text}
                  />
                ) : null}
              </div>
            </div>
          );
        })}

        {showThinking ? <ThinkingIndicator tool={busy ? activeToolOf(lastMessage) : null} /> : null}

        {reminders.length ? (
          <p className="assistant-demo-note">
            <Icon className="size-4 shrink-0" name="info" />
            Demonstração: {reminders.length}{" "}
            {reminders.length === 1 ? "lembrete simulado" : "lembretes simulados"} nesta sessão.
            Nada foi gravado.
          </p>
        ) : null}

        {error ? (
          <div className="assistant-error" role="alert">
            <Icon className="size-4 shrink-0" name="alert-circle" />
            <p>{friendlyChatError(error.message)}</p>
            <button
              className="assistant-chip"
              onClick={() => {
                clearError();
                void regenerate();
              }}
              type="button"
            >
              Tentar de novo
            </button>
          </div>
        ) : null}
      </div>

      <form
        className="assistant-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        {tooLong ? (
          <p className="assistant-composer__notice">
            Esta conversa ficou longa.
            <button onClick={onNewChat} type="button">
              Começar um novo chat
            </button>
          </p>
        ) : messages.length >= LONG_CHAT_MESSAGES ? (
          <p className="assistant-composer__notice">
            Conversas longas ficam mais lentas. Que tal
            <button onClick={onNewChat} type="button">
              começar um novo chat?
            </button>
          </p>
        ) : null}
        <label className="sr-only" htmlFor="assistant-question">
          Sua pergunta
        </label>
        <div className="assistant-composer__box">
          <textarea
            disabled={pending || tooLong}
            id="assistant-question"
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(draft);
              }
            }}
            placeholder={
              pending ? "Aprove ou cancele para continuar" : "Pergunte sobre suas cobranças…"
            }
            ref={inputRef}
            rows={1}
            value={draft}
          />
          {busy ? (
            <button
              aria-label="Parar a resposta"
              className="assistant-send assistant-send--stop"
              onClick={() => void stop()}
              title="Parar"
              type="button"
            >
              <Icon className="size-4" name="stop" />
            </button>
          ) : (
            <button
              aria-label="Enviar"
              className="assistant-send"
              disabled={!canSend}
              title="Enviar"
              type="submit"
            >
              <Icon className="size-4" name="send" />
            </button>
          )}
        </div>
        <p className="assistant-composer__hint">
          <span>Enter envia · Shift+Enter quebra a linha</span>
          {draft.length > 800 ? (
            <span>{draft.length}/1000</span>
          ) : (
            <span>IA pode errar. Confira os valores.</span>
          )}
        </p>
      </form>
    </>
  );
}
