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

function toCanonical(display: string): string {
  if (!display) return "";
  const value = Number.parseFloat(display);
  if (!Number.isFinite(value)) return "";
  const clamped = Math.min(100, Math.max(0, value));
  return String(clamped);
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

/** Percentual com vírgula brasileira e limite 0..100 por padrão. */
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
  const initial =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : String(defaultValue).replace(".", ",");
  const [display, setDisplay] = useState(initial);
  const canonical = toCanonical(display.replace(",", "."));
  const numeric = canonical === "" ? null : Number(canonical);
  const invalidMax = numeric !== null && numeric > max;

  const updateDisplay = (next: string) => {
    setDisplay(next);
    onCanonicalChange?.(toCanonical(next.replace(",", ".")));
  };

  return (
    <label className="field">
      <span className="field__label">
        {label}
        {optional ? <span className="field__optional">opcional</span> : null}
      </span>
      <input
        aria-invalid={Boolean(error) || invalidMax}
        aria-label={label}
        autoComplete="off"
        id={inputId}
        inputMode="decimal"
        onChange={(event) => updateDisplay(parsePercentageInput(event.target.value).replace(".", ","))}
        placeholder="Ex.: 5,5"
        type="text"
        value={display}
      />
      <input name={name} type="hidden" value={canonical} />
      <FieldError message={error} />
    </label>
  );
}
