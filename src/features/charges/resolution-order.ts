export type ResolvedCharge = {
  cancelled_at: string | null;
  paid_at: string | null;
  status: string;
};

export function chargeResolutionTimestamp(charge: ResolvedCharge) {
  return charge.status === "paid" ? charge.paid_at : charge.cancelled_at;
}

export function newestResolvedFirst<T extends ResolvedCharge>(charges: T[]) {
  return [...charges].sort((left, right) =>
    (chargeResolutionTimestamp(right) ?? "").localeCompare(chargeResolutionTimestamp(left) ?? ""),
  );
}
