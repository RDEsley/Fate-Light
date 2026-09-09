import type { TransferPreview } from "@/features/clients/entity-schemas";

export type TransferActionState = {
  message?: string;
  preview?: TransferPreview;
  targetClientId?: string;
  status: "error" | "idle" | "preview";
};

export const initialTransferState: TransferActionState = { status: "idle" };
