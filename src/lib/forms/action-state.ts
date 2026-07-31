export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  theme?: "light" | "dark" | "system";
};

export const initialActionState: ActionState = { status: "idle" };
