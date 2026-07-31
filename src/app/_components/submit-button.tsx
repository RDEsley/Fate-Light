"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel?: string;
};

export function SubmitButton({ idleLabel, pendingLabel = "Salvando…" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand text-brand-contrast hover:bg-brand-strong disabled:bg-muted min-h-11 rounded-xl px-5 py-3 font-semibold transition-colors disabled:cursor-wait"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
