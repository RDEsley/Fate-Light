"use client";

import { useEffect } from "react";

/**
 * Leva o usuário até o registro mencionado por um alerta: a lista abre rolando até a
 * linha certa e destaca a borda por alguns segundos. `targetId` é o `id` do elemento.
 */
export function FocusRecord({ targetId }: { targetId?: string }) {
  useEffect(() => {
    if (!targetId) return;
    const target = document.getElementById(targetId);
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
  }, [targetId]);

  return null;
}
