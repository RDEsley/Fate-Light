"use client";

import { useId, useState } from "react";

import { FieldError } from "./field-error";

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
  defaultValue?: number | string | null;
  error?: string;
  label: string;
  max?: number;
  name: string;
  onCanonicalChange?: (value: string) => void;
  optional?: boolean;
};

/**
 * Percentual com vírgula brasileira. Display e hidden representam o mesmo valor.
 * Valores acima de `max` ficam inválidos na UI; o servidor/Zod rejeita o limite.
 */
export function PercentField({
  defaultValue = null,
  error,
  label,
  max = 100,
  name,
  onCanonicalChange,
  optional = false,
}: PercentFieldProps) {
  const id = useId();
  const inputId = `${id}-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const initial =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : String(defaultValue).replace(".", ",");
  const [display, setDisplay] = useState(initial);
  const canonical = toPercentCanonical(display);
  const numeric = canonical === "" ? null : Number(canonical);
  const overMax = numeric !== null && numeric > max;
  const underMin = numeric !== null && numeric < 0;
  const localError =
    error ||
    (overMax ? `Informe no máximo ${String(max).replace(".", ",")}%.` : null) ||
    (underMin ? "O percentual não pode ser negativo." : null);

  const updateDisplay = (next: string) => {
    setDisplay(next);
    onCanonicalChange?.(toPercentCanonical(next));
  };

  const describedBy = localError ? errorId : undefined;

  return (
    <label className="field">
      <span className="field__label">
        {label}
        {optional ? <span className="field__optional">opcional</span> : null}
      </span>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(localError)}
        aria-label={label}
        autoComplete="off"
        id={inputId}
        inputMode="decimal"
        onChange={(event) =>
          updateDisplay(parsePercentageInput(event.target.value).replace(".", ","))
        }
        placeholder="Ex.: 5,5"
        type="text"
        value={display}
      />
      <input name={name} type="hidden" value={canonical} />
      <span className="sr-only" id={hintId}>
        Limite de {String(max).replace(".", ",")} por cento
      </span>
      <FieldError id={errorId} message={localError} />
    </label>
  );
}
