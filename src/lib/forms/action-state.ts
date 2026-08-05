export type ActionState = {
  status: "idle" | "error" | "success";
  /** Erros por nome de campo, para destacar o ponto exato do formulário. */
  fieldErrors?: Record<string, string>;
  message?: string;
};

export const initialActionState: ActionState = { status: "idle" };

export function actionError(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { fieldErrors, message, status: "error" };
}
