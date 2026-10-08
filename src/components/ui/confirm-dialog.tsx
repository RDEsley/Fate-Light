"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { blockedForGuest } from "../guest-guard";
import { FieldError } from "./field-error";
import { Icon, type IconName } from "./icon";
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
  phraseFieldName,
  requiredPhrase,
  title,
  tone = "danger",
  triggerIcon,
  triggerLabel,
}: {
  cancelLabel?: string;
  children?: ReactNode;
  className?: string;
  confirmLabel?: string;
  confirmation: string;
  holdSeconds?: number;
  icon?: IconName;
  label: string;
  /**
   * Envia o que foi digitado com este nome, para o servidor conferir a frase de verdade.
   * Sem isto a frase só é checada na tela.
   */
  phraseFieldName?: string;
  requiredPhrase?: string;
  title?: string;
  tone?: ModalTone;
  /** Ícone ao lado do texto do gatilho. */
  triggerIcon?: IconName;
  /** Nome acessível do gatilho quando várias linhas repetem o mesmo texto. */
  triggerLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sawPending, setSawPending] = useState(false);
  const [typed, setTyped] = useState("");
  const [remaining, setRemaining] = useState(holdSeconds);

  // Action que termina na própria tela (sem navegar) precisa devolver o controle: sem
  // isto o diálogo ficava aberto em "Confirmando…" para sempre depois da resposta.
  if (pending && !sawPending) setSawPending(true);
  if (!pending && sawPending) {
    setSawPending(false);
    if (submitting) {
      setSubmitting(false);
      setOpen(false);
      setTyped("");
    }
  }

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
    // Visitante não confirma nada: o aviso vem antes de pedir frase ou espera.
    if (blockedForGuest()) return;
    setRemaining(holdSeconds);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSubmitting(false);
    setTyped("");
  };
  const phraseOk = !requiredPhrase || typed.trim() === requiredPhrase;
  const unlocked = phraseOk && remaining === 0;

  const confirm = () => {
    if (!unlocked) return;
    const form = triggerRef.current?.form;
    // Com campo inválido o envio seria barrado e o aviso apareceria atrás do diálogo:
    // fecha primeiro, para o formulário mostrar o que falta.
    if (form && !form.checkValidity()) {
      setOpen(false);
      form.requestSubmit();
      return;
    }
    setSubmitting(true);
    // O envio real acontece no formulário que contém o gatilho, preservando os campos
    // ocultos já montados pela página. A navegação seguinte desmonta o diálogo.
    form?.requestSubmit();
  };

  return (
    <>
      {phraseFieldName ? <input name={phraseFieldName} type="hidden" value={typed.trim()} /> : null}
      <button
        aria-label={triggerLabel}
        className={className}
        onClick={start}
        ref={triggerRef}
        type="button"
      >
        {triggerIcon ? <Icon className="size-4" name={triggerIcon} /> : null}
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
            {typed && !phraseOk ? <FieldError message="A frase ainda não confere." /> : null}
          </label>
        ) : null}
      </Modal>
    </>
  );
}
