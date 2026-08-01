import { clientListHref, parseClientQuery } from "@/features/clients/query";
import { parseClientForm } from "@/features/clients/schemas";

function clientForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    companyName: "Fate Cliente",
    email: " CLIENTE@EXAMPLE.TEST ",
    name: "Cliente Exemplo",
    notes: "Uso operacional.",
    phone: "81999999999",
    status: "active",
    ...overrides,
  };
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("client domain boundaries", () => {
  it("normaliza o cadastro mínimo do cliente", () => {
    expect(parseClientForm(clientForm())).toEqual({
      address_json: null,
      commercial_status: "active",
      email: "cliente@example.test",
      kind: "company",
      name: "Cliente Exemplo",
      notes: "Uso operacional.",
      phone: "81999999999",
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: "Fate Cliente",
    });
  });

  it("rejeita telefone curto", () => {
    expect(parseClientForm(clientForm({ phone: "123" }))).toBeNull();
  });

  it("limita e preserva filtros válidos na paginação", () => {
    const query = parseClientQuery({ page: "2", q: "  exemplo ", state: "active" });
    expect(query).toEqual({ page: 2, q: "exemplo", state: "active" });
    expect(clientListHref(query, 3)).toBe("/clientes?q=exemplo&state=active&page=3");
    expect(parseClientQuery({ page: "inválida", state: "forjado" })).toMatchObject({
      page: 1,
      state: "all",
    });
  });
});
