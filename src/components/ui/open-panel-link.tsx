"use client";

import type { ReactNode } from "react";

/**
 * Atalho para um painel recolhível da mesma página. Abre, rola até ele e foca o primeiro
 * campo. O `href` continua válido como caminho sem JavaScript: a página abre o painel
 * pelo parâmetro da URL. Sem este atalho, clicar duas vezes no mesmo link não reabria um
 * painel fechado à mão, porque a URL já era a mesma.
 */
export function OpenPanelLink({
  children,
  className,
  href,
  panelId,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  panelId: string;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        const panel = document.getElementById(panelId);
        if (!(panel instanceof HTMLDetailsElement)) return;
        event.preventDefault();
        if (!panel.open) {
          // Quem rola é este atalho; o auto-scroll de disclosure faria o mesmo de novo.
          panel.dataset.skipAutoScroll = "true";
          panel.open = true;
        }
        const reducedMotion =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        panel.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        panel
          .querySelector<HTMLElement>(
            ".form-panel__body :is(input:not([type='hidden']), textarea, [role='combobox'])",
          )
          ?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
