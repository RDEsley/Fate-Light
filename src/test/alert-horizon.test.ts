import { alertHorizon, fallbackAlertOffsets } from "@/features/alerts/offsets";

describe("alert horizon", () => {
  it("usa o maior prazo escolhido pelo usuário", () => {
    expect(alertHorizon([1, 7, 30])).toBe(30);
    expect(alertHorizon([1])).toBe(1);
  });

  it("cai no padrão quando não há preferência salva", () => {
    expect(alertHorizon(null)).toBe(Math.max(...fallbackAlertOffsets));
    expect(alertHorizon([])).toBe(Math.max(...fallbackAlertOffsets));
  });

  it("ignora valores inválidos e nunca zera a janela", () => {
    expect(alertHorizon([Number.NaN, -5])).toBe(Math.max(...fallbackAlertOffsets));
    // "No dia" sozinho ainda precisa enxergar o próprio dia de hoje.
    expect(alertHorizon([0])).toBe(1);
  });
});
