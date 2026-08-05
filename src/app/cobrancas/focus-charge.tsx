"use client";

import { useEffect } from "react";

/**
 * Leva o usuário até a cobrança mencionada pelo alerta. O alerta funciona como guia:
 * clicar nele abre a lista já rolando suavemente até o card certo e destacando a borda.
 */
export function FocusCharge({ chargeId }: { chargeId?: string }) {
  useEffect(() => {
    if (!chargeId) return;
    const target = document.getElementById(`charge-${chargeId}`);
    if (!target) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
    target.setAttribute("data-focused", "true");

    const timer = window.setTimeout(() => target.removeAttribute("data-focused"), 3200);
    return () => {
      window.clearTimeout(timer);
      target.removeAttribute("data-focused");
    };
  }, [chargeId]);

  return null;
}
