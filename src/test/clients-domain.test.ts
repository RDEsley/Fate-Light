import { formatClientAddress, parseClientAddress } from "@/features/clients/address";
import { clientListHref, parseClientQuery } from "@/features/clients/query";
import { parseClientForm, parseContactForm } from "@/features/clients/schemas";

function clientForm(overrides: Record<string, string> = {}) {
  const values = {
    addressCity: "Recife",
    addressCountryCode: "br",
    addressDistrict: "Centro",
    addressLine1: "Rua Fictícia, 8",
    addressLine2: "",
    addressPostalCode: "50000-000",
    addressRegion: "pe",
    commercialStatus: "active",
    kind: "company",
    name: "Cliente Exemplo",
    notes: "Somente dados fictícios.",
    responsibleName: "Pessoa Responsável",
    tags: "Mensal, prioridade, MENSAL",
    taxId: "12.345.678/0001-95",
    tradeName: "Marca Exemplo",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("client domain boundaries", () => {
  it("normaliza documento, tags e endereço antes da persistência", () => {
    expect(parseClientForm(clientForm())).toEqual({
      address_json: {
        city: "Recife",
        country_code: "BR",
        district: "Centro",
        line1: "Rua Fictícia, 8",
        postal_code: "50000-000",
        region: "PE",
      },
      commercial_status: "active",
      kind: "company",
      name: "Cliente Exemplo",
      notes: "Somente dados fictícios.",
      responsible_name: "Pessoa Responsável",
      tags: ["mensal", "prioridade"],
      tax_id: "12345678000195",
      trade_name: "Marca Exemplo",
    });
  });

  it("rejeita documento com comprimento fora do contrato", () => {
    expect(parseClientForm(clientForm({ taxId: "123" }))).toBeNull();
  });

  it("exige um canal e normaliza e-mail de contato", () => {
    const valid = new FormData();
    valid.set("name", "Contato Exemplo");
    valid.set("email", " CONTATO@EXAMPLE.TEST ");
    valid.set("phone", "");
    valid.set("role", "Financeiro");
    valid.set("isPrimary", "on");
    expect(parseContactForm(valid)).toMatchObject({
      email: "contato@example.test",
      is_primary: true,
    });

    valid.set("email", "");
    expect(parseContactForm(valid)).toBeNull();
  });

  it("trata JSON de endereço como dado não confiável", () => {
    const address = parseClientAddress({
      city: "Recife",
      ignored: ["não deve escapar"],
      line1: "Rua Exemplo",
    });

    expect(address).toEqual({ city: "Recife", line1: "Rua Exemplo" });
    expect(formatClientAddress(address)).toEqual(["Rua Exemplo", "Recife"]);
  });

  it("limita e preserva filtros válidos na paginação", () => {
    const query = parseClientQuery({ page: "2", q: "  exemplo ", status: "active" });
    expect(query).toEqual({ page: 2, q: "exemplo", status: "active", view: "active" });
    expect(clientListHref(query, 3)).toBe("/clientes?q=exemplo&status=active&page=3");
    expect(parseClientQuery({ page: "inválida", status: "forjado" })).toMatchObject({
      page: 1,
      status: "all",
    });
  });
});
