"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon, type IconName } from "./icon";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export type ModalTone = "danger" | "default";

export function Modal({
  children,
  description,
  footer,
  icon,
  onClose,
  open,
  title,
  tone = "default",
}: {
  children?: ReactNode;
  description?: string;
  footer?: ReactNode;
  icon?: IconName;
  onClose: () => void;
  open: boolean;
  title: string;
  tone?: ModalTone;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Guardar o callback em ref evita que o efeito de foco seja refeito a cada render:
  // sem isso, digitar dentro do modal roubaria o foco do campo a cada tecla.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const focusables = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []),
    [],
  );

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // O primeiro foco vai para o painel para que leitores de tela anunciem título e descrição
    // antes das ações, em vez de começar pelo botão de confirmar.
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [focusables, open]);

  // `open` só vira verdadeiro por interação do usuário, então o portal nunca é criado
  // durante a renderização no servidor.
  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-panel"
        data-tone={tone}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="modal-panel__head">
          {icon ? (
            <span className="modal-panel__icon">
              <Icon className="size-5" name={icon} />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button aria-label="Fechar" onClick={onClose} type="button">
            <Icon className="size-4" name="x" />
          </button>
        </div>
        {children ? <div className="modal-panel__body">{children}</div> : null}
        {footer ? <div className="modal-panel__actions">{footer}</div> : null}
      </div>
    </div>,
    document.getElementById("portal-root") ?? document.body,
  );
}
