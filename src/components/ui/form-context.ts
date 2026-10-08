"use client";

import { createContext, useCallback, useContext } from "react";

export type FormFeedback = {
  /** Remove a marca de erro de um campo assim que o usuário volta a mexer nele. */
  clear: (name: string) => void;
  /** Erro vigente por nome de campo, venha da validação local ou do servidor. */
  errors: Record<string, string>;
};

export const FormFeedbackContext = createContext<FormFeedback | null>(null);

/**
 * Erro de um campo dentro de um `<Form>`. `explicit` cobre o uso avulso, fora de
 * formulário; dentro dele o campo só precisa do próprio `name` para ser destacado.
 */
export function useFieldFeedback(name: string | undefined, explicit?: string | null) {
  const feedback = useContext(FormFeedbackContext);
  const clearField = feedback?.clear;
  const error = explicit || (name ? feedback?.errors[name] : undefined) || undefined;
  const clear = useCallback(() => {
    if (name) clearField?.(name);
  }, [clearField, name]);
  return { clear, error };
}
