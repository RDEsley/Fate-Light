"use client";

import { useId, useState } from "react";

import {
  appendDigit,
  centsToCanonical,
  centsToDisplay,
  parseMoneyInputToCents,
  persistedToCents,
  removeLastDigit,
} from "@/features/mvp/money";

import { FieldError } from "./field-error";

type MoneyFieldProps = {
  defaultValue?: number | string | null;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  onCentsChange?: (cents: number | null) => void;
  optional?: boolean;
  placeholder?: string;
  required?: boolean;
};

/**
 * Entrada monetária estilo app bancário: dígitos deslocam centavos.
 * O campo visível é mascarado; o hidden envia decimal canônico ("1234.56").
 */
export function MoneyField({
  defaultValue = null,
  error,
  hint,
  label,
  name,
  onCentsChange,
  optional = false,
  placeholder = "R$ 0,00",
  required = false,
}: MoneyFieldProps) {
  const generatedId = useId();
  const inputId = `${generatedId}-${name}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [cents, setCents] = useState<number | null>(() => persistedToCents(defaultValue));

  const setValue = (next: number | null) => {
    setCents(next);
    onCentsChange?.(next);
  };

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <label className="field">
      <span className="field__label">
        {label}
        {optional ? <span className="field__optional">opcional</span> : null}
      </span>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-label={label}
        autoComplete="off"
        id={inputId}
        inputMode="numeric"
        onChange={(event) => {
          // onChange cobre colagem e autofill; digitação letra-a-letra é filtrada em keyDown.
          setValue(parseMoneyInputToCents(event.target.value));
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          const { key } = event;
          if (key === "Backspace") {
            event.preventDefault();
            setValue(removeLastDigit(cents));
            return;
          }
          if (key === "Delete") {
            event.preventDefault();
            setValue(null);
            return;
          }
          if (/^\d$/.test(key)) {
            event.preventDefault();
            setValue(appendDigit(cents, key));
            return;
          }
          // Bloqueia letras e símbolos; setas/tab/enter seguem o padrão do browser.
          if (key.length === 1) event.preventDefault();
        }}
        placeholder={placeholder}
        required={required && !optional}
        type="text"
        value={centsToDisplay(cents)}
      />
      <input name={name} type="hidden" value={centsToCanonical(cents)} />
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      <FieldError id={errorId} message={error} />
    </label>
  );
}
