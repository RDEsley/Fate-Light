"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Icon } from "./icon";

const duration = 6500;

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

export function ToastNotification({
  message,
  tone = "success",
}: {
  message: string;
  tone?: "error" | "success" | "warning";
}) {
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  // O toast é fixo à viewport, mas o card que o chama sempre vive dentro do wrapper
  // animado de entrada da página (`data-animate="enter"`). Enquanto esse wrapper anima
  // seu transform, ele vira containing block e o toast passa a ancorar nele em vez da
  // tela — daí aparecer deslocado logo que a página carrega. Um portal para fora dessa
  // árvore resolve isso de vez, não importa o que anime ao redor de quem o chamou. Só
  // pode existir depois da hidratação, porque o portal precisa do DOM real.
  const mounted = useMounted();
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const startTimer = () => {
    startedAt.current = performance.now();
    timer.current = window.setTimeout(() => setVisible(false), remaining.current);
  };

  useEffect(() => {
    startedAt.current = performance.now();
    timer.current = window.setTimeout(() => setVisible(false), remaining.current);
    return () => window.clearTimeout(timer.current);
  }, []);

  if (!visible || !mounted) return null;

  const pause = () => {
    if (paused) return;
    window.clearTimeout(timer.current);
    remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    setPaused(true);
  };

  const resume = () => {
    if (!paused) return;
    setPaused(false);
    startTimer();
  };

  const title = tone === "error" ? "Não deu certo" : tone === "warning" ? "Atenção" : "Tudo certo";
  const icon = tone === "success" ? "check" : "alert";

  return createPortal(
    <aside
      className="status-toast"
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
        <Icon className="size-4" name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-black">{title}</strong>
        <span className="text-muted mt-0.5 block text-xs leading-5">{message}</span>
      </span>
      <button aria-label="Fechar notificação" onClick={() => setVisible(false)} type="button">
        <Icon className="size-4" name="x" />
      </button>
      <span className="status-toast__progress" style={{ animationDuration: `${duration}ms` }} />
    </aside>,
    document.getElementById("portal-root") ?? document.body,
  );
}
