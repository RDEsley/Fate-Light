import {
  alertHorizon,
  alertOffsetLabel,
  fallbackAlertOffsets,
  parseAlertOffset,
} from "@/features/alerts/offsets";

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

  it("nomeia cada antecedência do mesmo jeito em todas as telas", () => {
    expect(alertOffsetLabel(0)).toBe("No dia");
    expect(alertOffsetLabel(1)).toBe("1 dia");
    expect(alertOffsetLabel(45)).toBe("45 dias");
  });

  it("só aceita antecedência personalizada em dias inteiros dentro do limite do banco", () => {
    expect(parseAlertOffset(" 45 ")).toBe(45);
    expect(parseAlertOffset("0")).toBe(0);
    expect(parseAlertOffset("365")).toBe(365);
    for (const raw of ["", "366", "-1", "1,5", "dez", "1000"]) {
      expect(parseAlertOffset(raw)).toBeNull();
    }
  });
});
