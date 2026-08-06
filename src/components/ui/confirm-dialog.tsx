"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { FieldError } from "./field-error";
import { type IconName } from "./icon";
import { Modal, type ModalTone } from "./modal";

/**
 * Botão de envio que abre uma confirmação própria em vez do diálogo nativo do navegador.
 * Quando `requiredPhrase` é informada, o envio só libera após a digitação exata da frase.
 * `holdSeconds` mantém o botão travado por alguns segundos: em exclusão irreversível o
 * tempo de leitura é parte da proteção, não enfeite.
 */
export function ConfirmDialog({
  cancelLabel = "Voltar",
  children,
  className,
  confirmLabel,
  confirmation,
  holdSeconds = 0,
  icon,
  label,
  requiredPhrase,
  title,
  tone = "danger",
}: {
  cancelLabel?: string;
  children?: ReactNode;
  className?: string;
  confirmLabel?: string;
  confirmation: string;
  holdSeconds?: number;
  icon?: IconName;
  label: string;
  requiredPhrase?: string;
  title?: string;
  tone?: ModalTone;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typed, setTyped] = useState("");
  const [remaining, setRemaining] = useState(holdSeconds);

  useEffect(() => {
    if (!open || !holdSeconds) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [holdSeconds, open]);

  // A contagem reinicia na abertura, não dentro do efeito: reabrir o diálogo tem de
  // cobrar a espera de novo, e zerar aqui evita render em cascata.
  const start = () => {
    setRemaining(holdSeconds);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setTyped("");
  };
  const phraseOk = !requiredPhrase || typed.trim() === requiredPhrase;
  const unlocked = phraseOk && remaining === 0;

  const confirm = () => {
    if (!unlocked) return;
    setSubmitting(true);
    // O envio real acontece no formulário que contém o gatilho, preservando os campos
    // ocultos já montados pela página. A navegação seguinte desmonta o diálogo.
    triggerRef.current?.form?.requestSubmit();
  };

  return (
    <>
      <button className={className} onClick={start} ref={triggerRef} type="button">
        {label}
      </button>
      <Modal
        description={confirmation}
        icon={icon ?? (tone === "danger" ? "alert" : "info")}
        onClose={close}
        open={open}
        title={title ?? label}
        tone={tone}
        footer={
          <>
            <button className="modal-cancel" disabled={submitting} onClick={close} type="button">
              {cancelLabel}
            </button>
            <button
              className={
                tone === "danger" ? "modal-confirm modal-confirm--danger" : "modal-confirm"
              }
              disabled={!unlocked || submitting}
              onClick={confirm}
              type="button"
            >
              {submitting
                ? "Confirmando…"
                : remaining > 0
                  ? `Aguarde ${remaining}s…`
                  : (confirmLabel ?? label)}
            </button>
          </>
        }
      >
        {children}
        {requiredPhrase ? (
          <label className="field">
            <span className="field__label">
              Digite <strong className="text-negative">{requiredPhrase}</strong> para liberar
            </span>
            <input
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              placeholder={requiredPhrase}
              value={typed}
            />
            {typed && !unlocked ? <FieldError message="A frase ainda não confere." /> : null}
          </label>
        ) : null}
      </Modal>
    </>
  );
}
