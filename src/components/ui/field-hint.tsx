"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "./icon";

/**
 * Explicação curta acionada por um `?` ao lado do rótulo. Abre no hover e no foco,
 * para funcionar igualmente no mouse, no teclado e na leitura de tela.
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
        type="button"
      >
        <Icon className="size-3.5" name="help" />
      </button>
      {open ? (
        <span className="field-hint__bubble" id={hintId} role="tooltip">
          {children}
        </span>
      ) : null}
    </span>
  );
}
