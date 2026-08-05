import { clientListHref, parseClientQuery } from "@/features/clients/query";
import { parseClientForm, parsePriorRevenue } from "@/features/clients/schemas";

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
      website: null,
    });
  });

  it("rejeita telefone curto", () => {
    expect(parseClientForm(clientForm({ phone: "123" }))).toBeNull();
  });

  it("aceita as novas situações comerciais e recusa valores forjados", () => {
    for (const status of ["budget", "pending", "blacklist"]) {
      expect(parseClientForm(clientForm({ status }))).toMatchObject({
        commercial_status: status,
      });
    }
    expect(parseClientForm(clientForm({ status: "archived" }))).toBeNull();
    expect(parseClientForm(clientForm({ status: "forjado" }))).toBeNull();
  });

  it("guarda somente o host do site, sem protocolo nem caminho", () => {
    expect(
      parseClientForm(clientForm({ website: "HTTPS://PadariaDoJoao.com.br/menu" })),
    ).toMatchObject({ website: "padariadojoao.com.br" });
    expect(parseClientForm(clientForm({ website: "" }))).toMatchObject({ website: null });
    expect(parseClientForm(clientForm({ website: "não é um site" }))).toBeNull();
  });

  it("lê o histórico anterior somente quando há valor informado", () => {
    const withValue = clientForm();
    withValue.set("priorRevenue", "24000");
    withValue.set("priorRevenueDate", "2026-01-31");
    expect(parsePriorRevenue(withValue)).toEqual({
      priorRevenue: 24000,
      priorRevenueDate: "2026-01-31",
    });

    expect(parsePriorRevenue(clientForm())).toBeNull();

    const zeroed = clientForm();
    zeroed.set("priorRevenue", "0");
    zeroed.set("priorRevenueDate", "2026-01-31");
    expect(parsePriorRevenue(zeroed)).toBeNull();
  });

  it("limita e preserva filtros válidos na paginação", () => {
    const query = parseClientQuery({ page: "2", q: "  exemplo ", state: "active" });
    expect(query).toEqual({ page: 2, q: "exemplo", state: "active" });
    expect(clientListHref(query, 3)).toBe("/clientes?q=exemplo&state=active&page=3");
    expect(parseClientQuery({ page: "inválida", state: "forjado" })).toMatchObject({
      page: 1,
      state: "all",
    });
    expect(parseClientQuery({ state: "archived" })).toMatchObject({ state: "archived" });
  });
});
