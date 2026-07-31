import { getInitials } from "@/lib/profile/initials";

describe("profile initials", () => {
  it("usa primeiro e último nomes sem expor imagem", () => {
    expect(getInitials("  Maria da Silva  ")).toBe("MS");
    expect(getInitials("richard")).toBe("R");
  });

  it("mantém um placeholder neutro para nome vazio", () => {
    expect(getInitials("   ")).toBe("FE");
  });
});
