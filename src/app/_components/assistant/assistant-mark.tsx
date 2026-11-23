import type { Ref } from "react";

type MarkSize = "lg" | "md" | "sm" | "xs";

/** Balão de conversa com uma estrela dentro: a identidade do assistente em qualquer tamanho. */
export function AssistantMark({
  className = "",
  live = false,
  size = "md",
}: {
  className?: string;
  /** A estrela pisca de tempos em tempos: só em lugares de destaque. */
  live?: boolean;
  size?: MarkSize;
}) {
  return (
    <span
      aria-hidden="true"
      className={`assistant-mark assistant-mark--${size} ${live ? "assistant-mark--live" : ""} ${className}`}
    >
      <svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3.2c-4.9 0-8.8 3.4-8.8 7.7 0 2.1.9 4 2.5 5.3l-.6 4 3.9-1.8c.9.2 1.9.4 3 .4 4.9 0 8.8-3.4 8.8-7.9S16.9 3.2 12 3.2Z" />
        <path
          className="assistant-mark__star"
          d="m12 6.9.95 2.7 2.7.95-2.7.95L12 14.2l-.95-2.7-2.7-.95 2.7-.95L12 6.9Z"
          fill="var(--assistant-star, var(--violet))"
        />
      </svg>
    </span>
  );
}

export function AssistantLauncher({
  expanded,
  onClick,
  ref,
}: {
  expanded: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-label="Abrir assistente"
      className="assistant-launcher"
      data-tour="assistant"
      onClick={onClick}
      ref={ref}
      title="Assistente com IA"
      type="button"
    >
      <AssistantMark live size="sm" />
      <span className="assistant-launcher__label">Assistente</span>
    </button>
  );
}
