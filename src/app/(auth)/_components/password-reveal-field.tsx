"use client";

import { useId, useState, type ReactNode } from "react";

import { FieldError } from "@/components/ui/field-error";
import { useFieldFeedback } from "@/components/ui/form-context";
import { Icon } from "@/components/ui/icon";

type PasswordRevealFieldProps = {
  autoComplete: string;
  hint?: string;
  id: string;
  label: string;
  /** Atalho ao lado do rótulo, como o link de recuperação na tela de login. */
  labelAction?: ReactNode;
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
  labelAction,
  maxLength = 72,
  minLength = 8,
  name,
  required = true,
}: PasswordRevealFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();
  const errorId = `${id}-error`;
  const feedback = useFieldFeedback(name);
  const describedBy = feedback.error ? errorId : hint ? hintId : undefined;

  return (
    <div className="field" data-invalid={feedback.error ? "true" : undefined}>
      <div className="field__head justify-between">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="auth-password-field">
        <input
          aria-describedby={describedBy}
          aria-invalid={feedback.error ? true : undefined}
          autoComplete={autoComplete}
          data-required-message="Informe a senha."
          id={id}
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          onChange={feedback.clear}
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
      {feedback.error ? (
        <FieldError id={errorId} message={feedback.error} />
      ) : hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
