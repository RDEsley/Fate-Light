"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Icon, type IconName } from "./icon";
import type { ToastTone } from "./toast-store";

const duration = 6500;
/** Espelha a duração de `status-toast-leave` no globals.css. */
const exitDuration = 180;

const noopSubscribe = () => () => {};

/** `true` só depois da hidratação, sem passar por um efeito com setState — evita
 * cascata de render e funciona porque o snapshot do servidor sempre é `false`. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const titles: Record<ToastTone, string> = {
  error: "Não deu certo",
  info: "Para você saber",
  success: "Tudo certo",
  warning: "Atenção",
};

const icons: Record<ToastTone, IconName> = {
  error: "alert-circle",
  info: "info",
  success: "check",
  warning: "alert",
};

export function ToastNotification({
  message,
  onDismiss,
  title,
  tone = "success",
}: {
  message: string;
  /** Chamado quando o cartão termina de sair, por tempo ou pelo botão de fechar. */
  onDismiss?: () => void;
  title?: string;
  tone?: ToastTone;
}) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  // O toast é fixo à viewport, mas quem o chama costuma viver dentro do wrapper animado
  // de entrada da página (`data-animate="enter"`). Enquanto esse wrapper anima seu
  // transform, ele vira containing block e o toast passa a ancorar nele em vez da tela.
  // Um portal para a pilha de avisos resolve isso de vez, não importa o que anime ao
  // redor. Só pode existir depois da hidratação, porque o portal precisa do DOM real.
  const mounted = useMounted();
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const exitTimer = useRef<number | undefined>(undefined);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  // Sai em dois tempos: primeiro a animação de saída, depois a remoção de fato.
  const leave = useCallback(() => {
    window.clearTimeout(timer.current);
    setLeaving(true);
    exitTimer.current = window.setTimeout(() => {
      setVisible(false);
      dismissRef.current?.();
    }, exitDuration);
  }, []);

  const startTimer = useCallback(() => {
    startedAt.current = performance.now();
    timer.current = window.setTimeout(leave, remaining.current);
  }, [leave]);

  useEffect(() => {
    startTimer();
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(exitTimer.current);
    };
  }, [startTimer]);

  if (!visible || !mounted) return null;

  const pause = () => {
    if (paused || leaving) return;
    window.clearTimeout(timer.current);
    remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    setPaused(true);
  };

  const resume = () => {
    if (!paused) return;
    setPaused(false);
    startTimer();
  };

  return createPortal(
    <div
      className="status-toast"
      data-leaving={leaving ? "true" : undefined}
      data-paused={paused}
      data-tone={tone}
      onMouseEnter={pause}
      onMouseLeave={resume}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "success" ? (
        <span aria-hidden="true" className="status-toast__confetti">
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      ) : null}
      <span className="status-toast__icon">
        <Icon className="size-4" name={icons[tone]} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="status-toast__title">{title ?? titles[tone]}</strong>
        <span className="status-toast__message">{message}</span>
      </span>
      <button aria-label="Fechar notificação" onClick={leave} type="button">
        <Icon className="size-4" name="x" />
      </button>
      <span className="status-toast__progress" style={{ animationDuration: `${duration}ms` }} />
    </div>,
    document.getElementById("toast-viewport") ??
      document.getElementById("portal-root") ??
      document.body,
  );
}
