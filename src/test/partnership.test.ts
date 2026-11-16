import { describe, expect, it } from "vitest";

import { partnershipFrom } from "@/features/clients/partnership";

const zone = "America/Sao_Paulo";

describe("tempo de parceria", () => {
  it("não existe enquanto o cliente não pagou nada", () => {
    expect(partnershipFrom(null, zone, "2026-11-16")).toBeNull();
    expect(partnershipFrom(undefined, zone, "2026-11-16")).toBeNull();
  });

  it("conta a partir do primeiro pagamento, em anos e meses", () => {
    expect(partnershipFrom("2024-08-15T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 2 anos e 3 meses",
    );
    expect(partnershipFrom("2025-11-16T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 1 ano",
    );
    expect(partnershipFrom("2026-06-10T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 5 meses",
    );
  });

  it("só fecha o mês quando o dia do mês chega", () => {
    expect(partnershipFrom("2026-10-17T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 30 dias",
    );
    expect(partnershipFrom("2026-10-16T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 1 mês",
    );
  });

  it("usa dias e hoje quando ainda não passou um mês", () => {
    expect(partnershipFrom("2026-11-16T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria começou hoje",
    );
    expect(partnershipFrom("2026-11-15T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 1 dia",
    );
    expect(partnershipFrom("2026-11-02T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria há 14 dias",
    );
  });

  it("respeita o fuso: pagamento às 22h de Brasília é do mesmo dia", () => {
    // 22:30 em Brasília = 01:30 UTC do dia seguinte.
    const result = partnershipFrom("2026-11-17T01:30:00Z", zone, "2026-11-16");
    expect(result?.text).toBe("Parceria começou hoje");
    expect(result?.title).toBe("Parceria desde 16/11/2026, data do primeiro pagamento");
  });

  it("não quebra com pagamento um dia à frente (tolerância de fuso da baixa)", () => {
    expect(partnershipFrom("2026-11-17T12:00:00Z", zone, "2026-11-16")?.text).toBe(
      "Parceria começou hoje",
    );
  });
});
