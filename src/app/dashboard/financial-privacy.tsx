"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

export function FinancialPrivacy({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className={hidden ? "financial-privacy financial-privacy--hidden" : "financial-privacy"}>
      <div className="mb-4 flex justify-end">
        <button
          aria-pressed={hidden}
          className="hover:bg-brand-soft flex min-h-11 items-center gap-2 rounded-xl border border-slate-700/15 bg-white px-3 text-sm font-black"
          onClick={() => setHidden((current) => !current)}
          type="button"
        >
          <Icon className="size-4" name={hidden ? "eye" : "eye-off"} />
          {hidden ? "Mostrar valores" : "Esconder valores"}
        </button>
      </div>
      {children}
    </div>
  );
}
