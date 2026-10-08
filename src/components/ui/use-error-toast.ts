"use client";

import { useEffect } from "react";

import { pushToast } from "./toast-store";

/**
 * Recusa de uma action que não passa por `<Form state>` (prévia, confirmação em duas
 * etapas): vai para a pilha de avisos em vez de virar uma faixa no meio do formulário.
 */
export function useErrorToast(state: { message?: string; status: string }) {
  useEffect(() => {
    if (state.status === "error" && state.message) {
      pushToast({ group: "form", message: state.message, tone: "error" });
    }
  }, [state]);
}
