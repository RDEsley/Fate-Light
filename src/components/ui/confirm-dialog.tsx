"use client";

import { useRef, useState } from "react";

import { Icon, type IconName } from "./icon";
import { Modal, type ModalTone } from "./modal";

/**
 * Botão de envio que abre uma confirmação própria em vez do diálogo nativo do navegador.
 * Quando `requiredPhrase` é informada, o envio só libera após a digitação exata da frase.
 */
export function ConfirmDialog({
  cancelLabel = "Voltar",
  className,
  confirmLabel,
  confirmation,
  icon,
  label,
  requiredPhrase,
  title,
  tone = "danger",
}: {
  cancelLabel?: string;
  className?: string;
  confirmLabel?: string;
  confirmation: string;
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

  const close = () => {
    setOpen(false);
    setTyped("");
  };
  const unlocked = !requiredPhrase || typed.trim() === requiredPhrase;

  const confirm = () => {
    if (!unlocked) return;
    setSubmitting(true);
    // O envio real acontece no formulário que contém o gatilho, preservando os campos
    // ocultos já montados pela página. A navegação seguinte desmonta o diálogo.
    triggerRef.current?.form?.requestSubmit();
  };

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} ref={triggerRef} type="button">
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
              {submitting ? "Confirmando…" : (confirmLabel ?? label)}
            </button>
          </>
        }
      >
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
            {typed && !unlocked ? (
              <span className="field__error">
                <Icon className="size-3.5" name="alert" /> A frase ainda não confere.
              </span>
            ) : null}
          </label>
        ) : null}
      </Modal>
    </>
  );
}
