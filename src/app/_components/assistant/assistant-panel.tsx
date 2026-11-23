"use client";

import { Chat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ui/icon";
import {
  deriveTitle,
  formatRelative,
  groupByDay,
  previewOf,
  readConversations,
  removeConversation,
  sanitizeForStorage,
  upsertConversation,
  writeConversations,
  type FeedbackMap,
  type StoredConversation,
} from "@/features/assistant/history";

import { AssistantConversation } from "./assistant-conversation";
import { AssistantLauncher, AssistantMark } from "./assistant-mark";

type Status = "consent_required" | "loading" | "ready" | "real_data_disabled" | "unavailable";
type View = "chat" | "history";
type Armed = "clear" | "wipe" | null;

// O AppFrame remonta a cada página: as conversas ativas ficam fora dele para não sumirem ao navegar.
const chats = new Map<string, Chat<UIMessage>>();

function chatFor(id: string, initial: UIMessage[]) {
  const existing = chats.get(id);
  if (existing) return existing;
  const chat = new Chat<UIMessage>({
    id,
    messages: initial,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  chats.set(id, chat);
  return chat;
}

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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
    <div className="assistant-notice">
      <AssistantMark size="lg" />
      <h3>Antes de usar com seus dados</h3>
      <p>
        Para responder, o assistente envia ao Google (Gemini) e, se ele falhar, à Groq o nome do
        cliente, a descrição, o valor e o vencimento das cobranças consultadas.
      </p>
      <p>
        No plano gratuito, esses provedores podem usar o conteúdo para melhorar seus produtos. CPF,
        CNPJ, telefone, e-mail, endereço, observações e arquivos nunca são enviados.
      </p>
      {failed ? (
        <p className="assistant-notice__error" role="alert">
          Não consegui registrar o aceite. Tente de novo.
        </p>
      ) : null}
      <button
        className="button button--primary"
        disabled={saving}
        onClick={() => void accept()}
        type="button"
      >
        Entendi e aceito
      </button>
    </div>
  );
}

function HistoryView({
  activeId,
  conversations,
  onDelete,
  onNew,
  onOpen,
}: {
  activeId: string | null;
  conversations: StoredConversation[];
  onDelete: (id: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const groups = useMemo(() => groupByDay(conversations), [conversations]);

  if (!conversations.length) {
    return (
      <div className="assistant-notice">
        <span className="assistant-notice__icon">
          <Icon className="size-6" name="history" />
        </span>
        <h3>Nenhuma conversa ainda</h3>
        <p>Suas conversas ficam guardadas aqui, só neste navegador, para você retomar depois.</p>
        <button className="button button--primary" onClick={onNew} type="button">
          <Icon className="size-4" name="plus" /> Nova conversa
        </button>
      </div>
    );
  }

  return (
    <div className="assistant-history">
      {groups.map((group) => (
        <section key={group.label}>
          <h3>{group.label}</h3>
          <ul>
            {group.items.map((item) => (
              <li className={item.id === activeId ? "is-active" : ""} key={item.id}>
                <button
                  className="assistant-history__open"
                  onClick={() => onOpen(item.id)}
                  type="button"
                >
                  <strong>{item.title}</strong>
                  <small>{previewOf(item.messages) || "Sem resposta ainda"}</small>
                  <span>
                    {formatRelative(item.updatedAt)} · {item.messages.length}{" "}
                    {item.messages.length === 1 ? "mensagem" : "mensagens"}
                  </span>
                </button>
                <button
                  aria-label={`Excluir a conversa: ${item.title}`}
                  className="assistant-history__delete"
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  <Icon className="size-4" name="trash" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function AssistantPanel({
  fullName,
  guest,
  workspaceName,
}: {
  fullName: string;
  guest: boolean;
  workspaceName: string;
}) {
  const scope = `${guest ? "guest" : "account"}:${workspaceName}:${fullName}`;
  const firstName = fullName.trim().split(/\s+/)[0] || "você";
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<View>("chat");
  const [wide, setWide] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [armed, setArmed] = useState<Armed>(null);
  const [busy, setBusy] = useState(false);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConversations(readConversations(safeStorage(), scope));
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [scope]);

  useEffect(() => {
    if (hydrated.current) writeConversations(safeStorage(), scope, conversations);
  }, [conversations, scope]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/agent", { cache: "no-store" });
      const body: { status?: Status } = await response.json();
      setStatus(response.ok && body.status ? body.status : "unavailable");
    } catch {
      setStatus("unavailable");
    }
  }, []);

  const newChat = useCallback(() => {
    setActiveId(crypto.randomUUID());
    setView("chat");
    setMenuOpen(false);
    setArmed(null);
    window.requestAnimationFrame(() => document.getElementById("assistant-question")?.focus());
  }, []);

  const openPanel = () => {
    setOpen(true);
    setEverOpened(true);
    if (!activeId) setActiveId(crypto.randomUUID());
    if (status !== "ready") void loadStatus();
    window.requestAnimationFrame(() => document.getElementById("assistant-question")?.focus());
  };

  const close = useCallback(() => {
    setOpen(false);
    setMenuOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) setMenuOpen(false);
      else close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, menuOpen, open]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const persist = useCallback((id: string, messages: UIMessage[], feedback: FeedbackMap) => {
    const saved = sanitizeForStorage(messages);
    if (!saved.length) return;
    setConversations((current) => {
      const existing = current.find((item) => item.id === id);
      if (
        existing &&
        JSON.stringify(existing.messages) === JSON.stringify(saved) &&
        JSON.stringify(existing.feedback) === JSON.stringify(feedback)
      ) {
        return current;
      }
      return upsertConversation(current, {
        feedback,
        id,
        messages: saved,
        title: existing?.title ?? deriveTitle(saved),
        updatedAt: Date.now(),
      });
    });
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      chats.delete(id);
      setConversations((current) => removeConversation(current, id));
      // Excluir pelo histórico não tira a pessoa de lá: só a conversa ativa é trocada por uma nova.
      if (activeId === id) setActiveId(crypto.randomUUID());
    },
    [activeId],
  );

  const clearCurrent = () => {
    if (armed !== "clear") {
      setArmed("clear");
      return;
    }
    if (activeId) deleteConversation(activeId);
    newChat();
  };

  const wipeAll = () => {
    if (armed !== "wipe") {
      setArmed("wipe");
      return;
    }
    chats.clear();
    setConversations([]);
    newChat();
  };

  const active = conversations.find((item) => item.id === activeId);
  const chat = useMemo(
    () => (activeId ? chatFor(activeId, sanitizeForStorage(active?.messages ?? [])) : null),
    // O Chat vivo guarda as mensagens: só o id decide qual instância usar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId],
  );
  const canClear = Boolean(active) || (chat?.messages.length ?? 0) > 0;
  const subtitle = guest
    ? "Demonstração · dados fictícios"
    : status === "ready"
      ? "Lê seus dados e pede confirmação"
      : "Em fase de testes";

  return (
    <>
      <AssistantLauncher expanded={open} onClick={openPanel} ref={triggerRef} />
      {everOpened
        ? createPortal(
            <>
              {open ? (
                <button
                  aria-label="Fechar assistente"
                  className="assistant-backdrop"
                  onClick={close}
                  tabIndex={-1}
                  type="button"
                />
              ) : null}
              <section
                aria-labelledby="assistant-title"
                className={`assistant-panel ${wide ? "assistant-panel--wide" : ""}`}
                hidden={!open}
                role="dialog"
              >
                <header className="assistant-header">
                  <AssistantMark live size="md" />
                  <div className="assistant-header__title">
                    <h2 id="assistant-title">Assistente</h2>
                    <p>
                      <span aria-hidden="true" className="assistant-status-dot" />
                      {subtitle}
                    </p>
                  </div>
                  <div className="assistant-header__actions">
                    <button
                      aria-label="Nova conversa"
                      className="assistant-icon-button"
                      disabled={busy}
                      onClick={newChat}
                      title={busy ? "Aguarde a resposta terminar" : "Nova conversa"}
                      type="button"
                    >
                      <Icon className="size-[1.15rem]" name="plus" />
                    </button>
                    <button
                      aria-label="Histórico de conversas"
                      aria-pressed={view === "history"}
                      className="assistant-icon-button"
                      disabled={busy}
                      onClick={() =>
                        setView((current) => (current === "history" ? "chat" : "history"))
                      }
                      title={busy ? "Aguarde a resposta terminar" : "Histórico"}
                      type="button"
                    >
                      <Icon className="size-[1.15rem]" name="history" />
                    </button>
                    <div className="assistant-menu" ref={menuRef}>
                      <button
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label="Mais opções"
                        className="assistant-icon-button"
                        onClick={() => setMenuOpen((current) => !current)}
                        title="Mais opções"
                        type="button"
                      >
                        <Icon className="size-[1.15rem]" name="settings" />
                      </button>
                      {menuOpen ? (
                        <div className="assistant-menu__list" role="menu">
                          <button
                            className={armed === "clear" ? "is-armed" : ""}
                            disabled={busy || !canClear}
                            onClick={clearCurrent}
                            role="menuitem"
                            type="button"
                          >
                            <Icon className="size-4" name="trash" />
                            {armed === "clear"
                              ? "Confirmar: limpar conversa"
                              : "Limpar esta conversa"}
                          </button>
                          <button
                            className="assistant-menu__wide"
                            onClick={() => {
                              setWide((current) => !current);
                              setMenuOpen(false);
                            }}
                            role="menuitem"
                            type="button"
                          >
                            <Icon className="size-4" name={wide ? "minimize" : "maximize"} />
                            {wide ? "Reduzir painel" : "Expandir painel"}
                          </button>
                          <button
                            className={armed === "wipe" ? "is-armed" : ""}
                            disabled={busy || !conversations.length}
                            onClick={wipeAll}
                            role="menuitem"
                            type="button"
                          >
                            <Icon className="size-4" name="archive" />
                            {armed === "wipe"
                              ? "Confirmar: apagar tudo"
                              : "Apagar todo o histórico"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <button
                      aria-label="Fechar assistente"
                      className="assistant-icon-button"
                      onClick={close}
                      title="Fechar"
                      type="button"
                    >
                      <Icon className="size-[1.15rem]" name="x" />
                    </button>
                  </div>
                </header>

                {status === "loading" ? (
                  <div className="assistant-loading" role="status">
                    <AssistantMark live size="lg" />
                    <span className="sr-only">Carregando o assistente</span>
                  </div>
                ) : null}
                {status === "unavailable" ? (
                  <div className="assistant-notice">
                    <span className="assistant-notice__icon">
                      <Icon className="size-6" name="alert-circle" />
                    </span>
                    <h3>Indisponível no momento</h3>
                    <p>
                      O assistente não está disponível agora. Tente de novo mais tarde; o resto do
                      sistema segue normal.
                    </p>
                  </div>
                ) : null}
                {status === "real_data_disabled" ? (
                  <div className="assistant-notice">
                    <AssistantMark live size="lg" />
                    <span className="assistant-badge">Em desenvolvimento · fase de testes</span>
                    <h3>Indisponível por enquanto</h3>
                    <p>
                      Estamos aperfeiçoando o assistente com cuidado. Por enquanto ele funciona só
                      no modo visitante, com dados fictícios, e logo chega para a sua conta.
                    </p>
                    <ul className="assistant-notice__list">
                      <li>
                        <Icon className="size-4" name="users" /> Mostra quem está em atraso
                      </li>
                      <li>
                        <Icon className="size-4" name="wallet" /> Resume recebidos e pendentes do
                        mês
                      </li>
                      <li>
                        <Icon className="size-4" name="bell" /> Cria lembretes só depois da sua
                        aprovação
                      </li>
                    </ul>
                    <p className="assistant-notice__hint">
                      <Icon className="size-4 shrink-0" name="info" />
                      <span>
                        Quer experimentar? Saia da conta e escolha{" "}
                        <strong>Explorar como visitante</strong> na tela de entrada. Seus dados
                        reais não são enviados a nenhum provedor de IA.
                      </span>
                    </p>
                  </div>
                ) : null}
                {status === "consent_required" ? (
                  <ConsentNotice onAccepted={() => setStatus("ready")} />
                ) : null}
                {status === "ready" && view === "history" ? (
                  <HistoryView
                    activeId={activeId}
                    conversations={conversations}
                    onDelete={deleteConversation}
                    onNew={newChat}
                    onOpen={(id) => {
                      setActiveId(id);
                      setView("chat");
                    }}
                  />
                ) : null}
                {status === "ready" && view === "chat" && chat && activeId ? (
                  <AssistantConversation
                    chat={chat}
                    conversationId={activeId}
                    firstName={firstName}
                    guest={guest}
                    initialFeedback={active?.feedback ?? {}}
                    key={activeId}
                    onBusyChange={setBusy}
                    onNewChat={newChat}
                    onPersist={persist}
                  />
                ) : null}
              </section>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
