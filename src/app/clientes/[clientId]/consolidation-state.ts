import type { ConsolidationPreview } from "@/features/clients/entity-schemas";

export type ConsolidationActionState = {
  message?: string;
  preview?: ConsolidationPreview;
  sourceClientId?: string;
  status: "error" | "idle" | "preview";
};

export const initialConsolidationState: ConsolidationActionState = { status: "idle" };
