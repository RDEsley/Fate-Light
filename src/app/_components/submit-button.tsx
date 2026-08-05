"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  className?: string;
  disabled?: boolean;
  idleLabel: string;
  pendingLabel?: string;
};

export function SubmitButton({
  className = "",
  disabled = false,
  idleLabel,
  pendingLabel = "Salvando…",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`bg-brand text-brand-contrast hover:bg-brand-strong disabled:bg-muted border-brand-strong disabled:border-muted min-h-11 rounded-xl border-2 px-5 py-2.5 font-black shadow-[2px_2px_0_rgba(37,50,58,.12)] disabled:cursor-wait disabled:shadow-none ${className}`}
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
