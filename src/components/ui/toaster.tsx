"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";

import { ToastNotification } from "./toast-notification";
import {
  dismissToast,
  pushToast,
  readServerToasts,
  readToasts,
  subscribeToasts,
  type ToastTone,
} from "./toast-store";

/** Pilha única de avisos do sistema, montada uma vez no layout raiz. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, readToasts, readServerToasts);

  return toasts.map((toast) => (
    <ToastNotification
      // A versão entra na chave: o mesmo aviso repetido reinicia tempo e animação.
      key={`${toast.id}:${toast.version}`}
      message={toast.message}
      onDismiss={() => dismissToast(toast.id)}
      title={toast.title}
      tone={toast.tone}
    />
  ));
}

type StatusToastProps = {
  message: string;
  /** Parâmetro da URL que carrega o resultado da ação anterior. */
  param?: string;
  tone: ToastTone;
};

function StatusToastTrigger({ message, param = "status", tone }: StatusToastProps) {
  const searchParams = useSearchParams();
  // Fora do roteador (testes de unidade) não há URL a observar: dispara uma vez.
  const active = searchParams ? searchParams.get(param) : "static";

  useEffect(() => {
    if (!active) return;
    pushToast({ group: "status", message, tone });
    // O resultado já foi mostrado: tirá-lo da URL evita repetir o aviso ao recarregar ou
    // voltar no histórico, e faz a mesma ação repetida (pagar duas cobranças seguidas)
    // voltar a ser uma navegação nova — antes o segundo aviso simplesmente não aparecia.
    const url = new URL(window.location.href);
    if (!url.searchParams.has(param)) return;
    url.searchParams.delete(param);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [active, message, param, tone]);

  return null;
}

/**
 * Aviso do resultado de uma ação que terminou em redirecionamento (`?status=`). O aviso
 * vai para a pilha global, então sobrevive ao redesenho da página que o originou.
 */
export function StatusToast(props: StatusToastProps) {
  return (
    <Suspense fallback={null}>
      <StatusToastTrigger {...props} />
    </Suspense>
  );
}
