import { describe, expect, it } from "vitest";

import {
  currentServiceOwnRevenue,
  promotionalStatusLabel,
} from "@/features/mvp/service-pricing";

const base = {
  discountType: "none" as const,
  discountValue: 0,
  listPrice: 350,
  promotionalCycles: null as number | null,
  promotionalCyclesUsed: 0,
  promotionalPrice: null as number | null,
};

describe("currentServiceOwnRevenue", () => {
  it("sem promoção usa o valor cheio", () => {
    expect(currentServiceOwnRevenue(base)).toMatchObject({
      amount: 350,
      promoActive: false,
    });
  });

  it("promoção ativa antes da primeira cobrança", () => {
    const result = currentServiceOwnRevenue({
      ...base,
      promotionalCycles: 3,
      promotionalCyclesUsed: 0,
      promotionalPrice: 250,
    });
    expect(result).toMatchObject({ amount: 250, promoActive: true, promoRemaining: 3 });
    expect(promotionalStatusLabel({ ...result, promotionalCyclesUsed: 0 })).toBe(
      "Promoção ativa · 3 primeiras cobranças",
    );
  });

  it("promoção parcialmente consumida", () => {
    const result = currentServiceOwnRevenue({
      ...base,
      promotionalCycles: 3,
      promotionalCyclesUsed: 1,
      promotionalPrice: 250,
    });
    expect(result).toMatchObject({ amount: 250, promoActive: true, promoRemaining: 2 });
    expect(promotionalStatusLabel({ ...result, promotionalCyclesUsed: 1 })).toBe(
      "Promoção ativa · 2 cobrança(s) promocional(is) restante(s)",
    );
  });

  it("promoção encerrada volta ao valor normal", () => {
    expect(
      currentServiceOwnRevenue({
        ...base,
        promotionalCycles: 3,
        promotionalCyclesUsed: 3,
        promotionalPrice: 250,
      }),
    ).toMatchObject({ amount: 350, promoActive: false, promoRemaining: 0 });
  });

  it("aceita valor promocional zero", () => {
    expect(
      currentServiceOwnRevenue({
        ...base,
        promotionalCycles: 2,
        promotionalCyclesUsed: 0,
        promotionalPrice: 0,
      }).amount,
    ).toBe(0);
  });

  it("respeita desconto quando não há promoção ativa", () => {
    expect(
      currentServiceOwnRevenue({
        ...base,
        discountType: "fixed",
        discountValue: 50,
        promotionalCycles: 2,
        promotionalCyclesUsed: 2,
        promotionalPrice: 100,
      }).amount,
    ).toBe(300);
  });
});
