import { appendNextPath, sanitizeNextPath } from "@/lib/auth/redirects";

describe("auth redirect safety", () => {
  it("preserva somente destinos internos", () => {
    expect(sanitizeNextPath("/perfil?tab=preferencias")).toBe("/perfil?tab=preferencias");
    expect(sanitizeNextPath("https://malicious.example/collect")).toBe("/perfil");
    expect(sanitizeNextPath("//malicious.example/collect")).toBe("/perfil");
    expect(sanitizeNextPath("/\\malicious.example")).toBe("/perfil");
    expect(sanitizeNextPath("/perfil\nSet-Cookie:test=1")).toBe("/perfil");
  });

  it("codifica o destino ao anexá-lo a outra rota", () => {
    expect(appendNextPath("/login", "/perfil?tab=conta&view=compacta")).toBe(
      "/login?next=%2Fperfil%3Ftab%3Dconta%26view%3Dcompacta",
    );
  });
});
