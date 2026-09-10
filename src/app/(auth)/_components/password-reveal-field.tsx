"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui/icon";

type PasswordRevealFieldProps = {
  autoComplete: string;
  hint?: string;
  id: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  required?: boolean;
};

export function PasswordRevealField({
  autoComplete,
  hint,
  id,
  label,
  maxLength = 72,
  minLength = 8,
  name,
  required = true,
}: PasswordRevealFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-password-field">
        <input
          aria-describedby={hint ? hintId : undefined}
          autoComplete={autoComplete}
          className="text-base"
          id={id}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          required={required}
          type={visible ? "text" : "password"}
        />
        <button
          aria-controls={id}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="auth-password-field__toggle"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          <Icon className="size-4" name={visible ? "eye-off" : "eye"} />
        </button>
      </div>
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
