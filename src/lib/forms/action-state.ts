export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialActionState: ActionState = { status: "idle" };
