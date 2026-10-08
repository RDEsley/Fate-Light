"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Field } from "./field";
import { useFieldFeedback } from "./form-context";

function parsePercentageInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,.]/g, "");
  if (!cleaned) return "";
  const normalized = cleaned.replace(",", ".");
  const match = normalized.match(/^(\d{0,3})(?:\.(\d{0,4}))?/);
  if (!match) return "";
  const whole = match[1] ?? "";
  const fraction = match[2];
  if (fraction !== undefined) return `${whole}.${fraction}`;
  return whole;
}

/** Converte display pt-BR para canônico sem clamp silencioso. */
export function toPercentCanonical(display: string): string {
  if (!display) return "";
  const value = Number.parseFloat(display.replace(",", "."));
  if (!Number.isFinite(value)) return "";
  return String(value);
}

type PercentFieldProps = {
  className?: string;
  defaultValue?: number | string | null;
  error?: string;
  hint?: string;
  label: string;
  max?: number;
  name: string;
  onCanonicalChange?: (value: string) => void;
  optional?: boolean;
  required?: boolean;
};

/**
 * Percentual com vírgula brasileira. Display e hidden representam o mesmo valor.
 * Valores acima de `max` ficam inválidos na UI e barram o envio; o servidor repete a regra.
 */
export function PercentField({
  className,
  defaultValue = null,
  error,
  hint,
  label,
  max = 100,
  name,
  onCanonicalChange,
  optional = false,
  required = false,
}: PercentFieldProps) {
  const id = useId();
  const inputId = `${id}-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const feedback = useFieldFeedback(name, error);
  const initial =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : String(defaultValue).replace(".", ",");
  const [display, setDisplay] = useState(initial);
  const canonical = toPercentCanonical(display);
  const numeric = canonical === "" ? null : Number(canonical);
  const limitError =
    numeric !== null && numeric > max
      ? `Informe no máximo ${String(max).replace(".", ",")}%.`
      : numeric !== null && numeric < 0
        ? "O percentual não pode ser negativo."
        : null;
  const localError = feedback.error || limitError || undefined;

  // O limite também vira restrição do controle, para o formulário barrar o envio aqui
  // em vez de deixar a recusa para o servidor.
  useEffect(() => {
    inputRef.current?.setCustomValidity(limitError ?? "");
  }, [limitError]);

  const updateDisplay = (next: string) => {
    setDisplay(next);
    feedback.clear();
    onCanonicalChange?.(toPercentCanonical(next));
  };

  return (
    <Field
      className={className}
      error={localError}
      errorId={errorId}
      hint={hint}
      htmlFor={inputId}
      label={label}
      optional={optional}
    >
      <input
        aria-describedby={localError ? errorId : undefined}
        aria-invalid={localError ? true : undefined}
        aria-label={label}
        autoComplete="off"
        data-field={name}
        id={inputId}
        inputMode="decimal"
        onChange={(event) =>
          updateDisplay(parsePercentageInput(event.target.value).replace(".", ","))
        }
        placeholder="Ex.: 5,5"
        ref={inputRef}
        required={required && !optional}
        type="text"
        value={display}
      />
      <input name={name} type="hidden" value={canonical} />
      <span className="sr-only" id={hintId}>
        Limite de {String(max).replace(".", ",")} por cento
      </span>
    </Field>
  );
}
