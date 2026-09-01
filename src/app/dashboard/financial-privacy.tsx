"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/components/ui/icon";

export function FinancialPrivacy({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [controlHost, setControlHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setControlHost(document.getElementById("financial-privacy-control"));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className={hidden ? "financial-privacy financial-privacy--hidden" : "financial-privacy"}>
      {controlHost
        ? createPortal(
            <button
              aria-label={hidden ? "Mostrar valores" : "Esconder valores"}
              aria-pressed={hidden}
              className="cartoon-card hover:bg-brand-soft grid size-10 place-items-center"
              onClick={() => setHidden((current) => !current)}
              title={hidden ? "Mostrar valores" : "Esconder valores"}
              type="button"
            >
              <Icon className="size-[1.1rem]" name={hidden ? "eye" : "eye-off"} />
            </button>,
            controlHost,
          )
        : null}
      {children}
    </div>
  );
}
