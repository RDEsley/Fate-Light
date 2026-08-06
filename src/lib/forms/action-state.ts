export type ActionState = {
  status: "idle" | "error" | "success";
  /** Erros por nome de campo, para destacar o ponto exato do formulário. */
  fieldErrors?: Record<string, string>;
  message?: string;
  /**
   * O que o usuário havia digitado. O React devolve todo campo não controlado ao
   * `defaultValue` assim que a action termina, então sem isto uma recusa do servidor
   * esvaziava o formulário inteiro por causa de um único campo errado.
   */
  values?: Record<string, string[]>;
};

export const initialActionState: ActionState = { status: "idle" };

/** Erro sem formulário a preservar: sessão perdida, registro inexistente, id inválido. */
export function actionError(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { fieldErrors, message, status: "error" };
}

function readFormValues(formData: FormData) {
  const values: Record<string, string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") (values[key] ??= []).push(value);
  }
  return values;
}

/** Recusa preservando o que foi enviado, para o formulário voltar preenchido. */
export function rejectSubmission(
  formData: FormData,
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return { fieldErrors, message, status: "error", values: readFormValues(formData) };
}

/**
 * Leitura dos valores devolvidos, do lado do formulário. `resubmitting` separa "ainda não
 * enviei" de "enviei e o servidor recusou": só no segundo caso o que veio de volta vale
 * mais que o valor do registro sendo editado — e é o único jeito de uma caixa desmarcada
 * de propósito não voltar marcada, já que checkbox sem marca não chega no FormData.
 */
export function submittedValues(state: ActionState) {
  const values = state.values;
  return {
    checkbox: (name: string, fallback = false) => (values ? values[name]?.[0] === "on" : fallback),
    list: (name: string) => values?.[name],
    resubmitting: Boolean(values),
    text: (name: string, fallback = "") => values?.[name]?.[0] ?? fallback,
  };
}
