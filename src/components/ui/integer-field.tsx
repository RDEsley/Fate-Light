"use client";

import { useId, useState } from "react";

import { Field } from "./field";
import { useFieldFeedback } from "./form-context";

type IntegerFieldProps = {
  className?: string;
  defaultValue?: number | string | null;
  error?: string;
  hint?: string;
  label: string;
  max?: number;
  min?: number;
  name: string;
  onValueChange?: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
  required?: boolean;
};

/** Inteiro digit-only: rejeita notação científica e letras. */
export function IntegerField({
  className,
  defaultValue = null,
  error,
  hint,
  label,
  max,
  min = 0,
  name,
  onValueChange,
  optional = false,
  placeholder,
  required = false,
}: IntegerFieldProps) {
  const id = useId();
  const inputId = `${id}-${name}`;
  const errorId = `${inputId}-error`;
  const feedback = useFieldFeedback(name, error);
  const initial =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : String(Math.trunc(Number(defaultValue)));
  const [value, setValue] = useState(initial === "NaN" ? "" : initial);

  const update = (next: string) => {
    setValue(next);
    feedback.clear();
    onValueChange?.(next);
  };

  return (
    <Field
      className={className}
      error={feedback.error}
      errorId={errorId}
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
        id={inputId}
        inputMode="numeric"
        name={name}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (!digits) {
            update("");
            return;
          }
          let next = Number.parseInt(digits, 10);
          if (max !== undefined) next = Math.min(next, max);
          if (min !== undefined) next = Math.max(next, min);
          update(String(next));
        }}
        placeholder={placeholder}
        required={required && !optional}
        type="text"
        value={value}
      />
    </Field>
  );
}
