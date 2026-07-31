"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({ idleLabel }: { idleLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="bg-brand text-brand-contrast hover:bg-brand-strong disabled:bg-muted mt-2 min-h-11 w-full rounded-xl px-4 py-3 font-semibold transition-colors disabled:cursor-wait"
      disabled={pending}
      type="submit"
    >
      {pending ? "Enviando link…" : idleLabel}
    </button>
  );
}
