import { newestResolvedFirst } from "@/features/charges/resolution-order";

describe("newestResolvedFirst", () => {
  it("intercala pagas e canceladas pela resolução mais recente", () => {
    const charges = newestResolvedFirst([
      { cancelled_at: null, id: "paid-old", paid_at: "2026-08-20T12:00:00Z", status: "paid" },
      { cancelled_at: "2026-08-25T09:00:00Z", id: "cancelled", paid_at: null, status: "cancelled" },
      { cancelled_at: null, id: "paid-new", paid_at: "2026-08-26T18:00:00Z", status: "paid" },
    ]);

    expect(charges.map(({ id }) => id)).toEqual(["paid-new", "cancelled", "paid-old"]);
  });
});
