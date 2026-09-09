"use client";

import { useEffect } from "react";

const disclosureSelector = ".form-disclosure, .advanced-form, .danger-zone";

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Quando um `<details>` de formulário abre e o conteúdo sai da viewport,
 * rola a página o mínimo necessário para o bloco voltar a ser legível.
 * O evento `toggle` não borbulha — escuta em capture no document.
 */
export function DisclosureAutoScroll() {
  useEffect(() => {
    const onToggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.open) return;
      if (!details.matches(disclosureSelector)) return;

      // Nested advanced-form inside an already-open disclosure: still scroll if needed.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const rect = details.getBoundingClientRect();
          const margin = 20;
          const overflowsBottom = rect.bottom > window.innerHeight - margin;
          const overflowsTop = rect.top < margin;
          if (!overflowsBottom && !overflowsTop) return;

          details.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            // Painéis altos (opções avançadas): ancora o topo; aberturas curtas: traz o fim.
            block:
              overflowsTop || rect.height > window.innerHeight * 0.72 ? "start" : "nearest",
          });
        });
      });
    };

    document.addEventListener("toggle", onToggle, true);
    return () => document.removeEventListener("toggle", onToggle, true);
  }, []);

  return null;
}

/** Rola um popover absoluto (combobox/select) para dentro da viewport ao abrir. */
export function scrollPopoverIntoView(element: HTMLElement | null) {
  if (!element) return;
  window.requestAnimationFrame(() => {
    const rect = element.getBoundingClientRect();
    const margin = 16;
    if (rect.bottom <= window.innerHeight - margin && rect.top >= margin) return;
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  });
}
