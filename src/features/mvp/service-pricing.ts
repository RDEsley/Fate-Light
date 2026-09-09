/**
 * Valor próprio da próxima cobrança automática, alinhado à regra do settle:
 * promoção enquanto houver ciclos restantes; senão listPrice com desconto.
 */
export function currentServiceOwnRevenue(service: {
  discountType: "fixed" | "none" | "percentage";
  discountValue: number;
  listPrice: number;
  promotionalCycles: number | null;
  promotionalCyclesUsed: number;
  promotionalPrice: number | null;
}) {
  const promoRemaining =
    service.promotionalPrice !== null && service.promotionalCycles !== null
      ? Math.max(0, service.promotionalCycles - service.promotionalCyclesUsed)
      : 0;

  if (promoRemaining > 0 && service.promotionalPrice !== null) {
    return {
      amount: service.promotionalPrice,
      promoActive: true as const,
      promoRemaining,
      promoTotalCycles: service.promotionalCycles ?? 0,
    };
  }

  const discounted =
    service.discountType === "percentage"
      ? service.listPrice * (1 - service.discountValue / 100)
      : service.discountType === "fixed"
        ? service.listPrice - service.discountValue
        : service.listPrice;

  return {
    amount: discounted,
    promoActive: false as const,
    promoRemaining: 0,
    promoTotalCycles: service.promotionalCycles ?? 0,
  };
}

export function promotionalStatusLabel(input: {
  promoActive: boolean;
  promoRemaining: number;
  promoTotalCycles: number;
  promotionalCyclesUsed: number;
}) {
  if (!input.promoActive) return null;
  if (input.promotionalCyclesUsed <= 0) {
    return `Promoção ativa · ${input.promoTotalCycles} primeira${input.promoTotalCycles === 1 ? "" : "s"} cobrança${input.promoTotalCycles === 1 ? "" : "s"}`;
  }
  return `Promoção ativa · ${input.promoRemaining} cobrança(s) promocional(is) restante(s)`;
}
