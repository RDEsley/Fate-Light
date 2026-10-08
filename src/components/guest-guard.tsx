"use client";

import { useEffect } from "react";

import { pushToast } from "@/components/ui/toast-store";
import { guestNotice, guestNoticeTitle } from "@/lib/demo/guest";

// Estado do navegador, ligado só depois da hidratação: no servidor continua sempre falso.
let guestActive = false;

function notifyGuest() {
  pushToast({
    action: { href: "/cadastro", label: "Criar conta" },
    group: "guest",
    message: guestNotice,
    title: guestNoticeTitle,
    tone: "info",
  });
}

/**
 * Para o que não passa por envio de formulário (abrir uma confirmação, ação disparada por
 * código): avisa o visitante e devolve `true` para quem chamou desistir.
 */
export function blockedForGuest() {
  if (!guestActive) return false;
  notifyGuest();
  return true;
}

/** Busca e filtros são formulários GET comuns: só mudam a URL e continuam liberados. */
function isNavigation(form: HTMLFormElement, submitter: HTMLElement | null) {
  const action = submitter?.getAttribute("formaction") ?? form.getAttribute("action") ?? "";
  const method = submitter?.getAttribute("formmethod") ?? form.getAttribute("method") ?? "get";
  return method.toLowerCase() === "get" && !action.startsWith("javascript:");
}

/**
 * Modo visitante no navegador: intercepta todo envio de formulário antes do React e mostra
 * o aviso no lugar. É conforto, não segurança — o servidor recusa as ações por conta
 * própria e o visitante nem tem sessão para gravar algo.
 */
export function GuestGuard() {
  useEffect(() => {
    guestActive = true;
    const intercept = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if ("guestAllowed" in form.dataset || isNavigation(form, event.submitter)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      notifyGuest();
    };
    // Captura na janela: roda antes do ouvinte que o React mantém na raiz do app.
    window.addEventListener("submit", intercept, true);
    return () => {
      guestActive = false;
      window.removeEventListener("submit", intercept, true);
    };
  }, []);

  return null;
}
