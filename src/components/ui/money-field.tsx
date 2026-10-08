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

import { Field } from "./field";
import { useFieldFeedback } from "./form-context";

type MoneyFieldProps = {
  className?: string;
  defaultValue?: number | string | null;
  error?: string;
  help?: string;
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
  className,
  defaultValue = null,
  error,
  help,
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
  const feedback = useFieldFeedback(name, error);
  const [cents, setCents] = useState<number | null>(() => persistedToCents(defaultValue));

  const setValue = (next: number | null) => {
    setCents(next);
    feedback.clear();
    onCentsChange?.(next);
  };

  return (
    <Field
      className={className}
      error={feedback.error}
      errorId={errorId}
      help={help}
      hint={hint}
      htmlFor={inputId}
      label={label}
      optional={optional}
    >
      <input
        aria-describedby={feedback.error ? errorId : undefined}
        aria-invalid={feedback.error ? true : undefined}
        aria-label={label}
        autoComplete="off"
        data-field={name}
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
    </Field>
  );
}
