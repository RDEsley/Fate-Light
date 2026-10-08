"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icon } from "./icon";

/** Distância mínima entre o balão e a borda da tela. */
const viewportMargin = 12;
const triggerGap = 8;

/**
 * Explicação curta acionada por um ícone de informação ao lado do rótulo. Abre no hover
 * e no foco, para funcionar igualmente no mouse, no teclado e na leitura de tela.
 */
export function FieldHint({
  children,
  label = "O que é isso?",
}: {
  children: string;
  label?: string;
}) {
  const hintId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeWithEscape);
    document.addEventListener("pointerdown", closeOnOutside);
    return () => {
      document.removeEventListener("keydown", closeWithEscape);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [open]);

  // O balão vive num portal com posição fixa calculada: preso ao rótulo ele era cortado
  // pela borda da tela em campos estreitos e ficava atrás de modais e cartões vizinhos.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const bubble = bubbleRef.current;
      if (!trigger || !bubble) return;
      const rect = trigger.getBoundingClientRect();
      const centered = rect.left + rect.width / 2 - bubble.offsetWidth / 2;
      const left = Math.max(
        viewportMargin,
        Math.min(centered, window.innerWidth - bubble.offsetWidth - viewportMargin),
      );
      const above = rect.top - bubble.offsetHeight - triggerGap;
      const fitsAbove = above >= viewportMargin;
      bubble.style.left = `${left}px`;
      bubble.style.top = `${fitsAbove ? above : rect.bottom + triggerGap}px`;
      bubble.dataset.placement = fitsAbove ? "top" : "bottom";
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <span
      className="field-hint"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      ref={rootRef}
    >
      <button
        aria-describedby={open ? hintId : undefined}
        aria-expanded={open}
        aria-label={label}
        className="field-hint__trigger"
        // O clique só abre: o foco que o precede já abriu, e alternar aqui fecharia
        // a explicação no mesmo gesto. Fechar fica com Escape, blur e clique fora.
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Icon className="size-4" name="info" />
      </button>
      {open
        ? createPortal(
            <span className="field-hint__bubble" id={hintId} ref={bubbleRef} role="tooltip">
              {children}
            </span>,
            document.getElementById("portal-root") ?? document.body,
          )
        : null}
    </span>
  );
}
