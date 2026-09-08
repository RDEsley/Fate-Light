"use client";

import { useId, useState } from "react";

import { FieldError } from "./field-error";

type IntegerFieldProps = {
  defaultValue?: number | string | null;
  error?: string;
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
  defaultValue = null,
  error,
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
  const initial =
    defaultValue === null || defaultValue === undefined || defaultValue === ""
      ? ""
      : String(Math.trunc(Number(defaultValue)));
  const [value, setValue] = useState(initial === "NaN" ? "" : initial);

  const update = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };

  return (
    <label className="field">
      <span className="field__label">
        {label}
        {optional ? <span className="field__optional">opcional</span> : null}
      </span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        autoComplete="off"
        id={inputId}
        inputMode="numeric"
        max={max}
        min={min}
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
      <FieldError message={error} />
    </label>
  );
}
