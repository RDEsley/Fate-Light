import { formatDateTimePtBr, isoDateOfInstant } from "@/features/mvp/format";

describe("instantes exibidos no fuso do workspace", () => {
  it("mostra o pagamento das 22h de Brasília no próprio dia, não no seguinte", () => {
    // 22:30 de 14/11 em Brasília é 01:30 de 15/11 em UTC.
    expect(isoDateOfInstant("2026-11-15T01:30:00+00:00", "America/Sao_Paulo")).toBe("2026-11-14");
    expect(isoDateOfInstant("2026-11-15T12:00:00.000Z", "America/Sao_Paulo")).toBe("2026-11-15");
  });

  it("devolve o valor original quando ele não é um instante", () => {
    expect(isoDateOfInstant("não é data", "America/Sao_Paulo")).toBe("não é data");
  });

  it("formata data e hora no fuso informado", () => {
    expect(formatDateTimePtBr("2026-11-15T01:30:00Z", "America/Sao_Paulo")).toBe(
      "14/11/2026, 22:30",
    );
  });
});
