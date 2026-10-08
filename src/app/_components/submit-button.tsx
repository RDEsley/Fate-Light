"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  idleLabel: string;
  pendingLabel?: string;
  variant?: "danger" | "primary";
};

export function SubmitButton({
  className = "",
  disabled = false,
  idleLabel,
  pendingLabel = "Salvando…",
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending || undefined}
      className={`button button--${variant} ${className}`}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? <span aria-hidden="true" className="button__spinner" /> : null}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
