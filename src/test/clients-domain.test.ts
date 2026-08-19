import { clientListHref, parseClientQuery } from "@/features/clients/query";
import {
  parseClientForm,
  parseClientLinks,
  parsePriorRevenue,
  readClientLinks,
} from "@/features/clients/schemas";

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

/** Atalho para os casos que só olham o cadastro normalizado, não o erro. */
function parsedClient(formData: FormData) {
  const parsed = parseClientForm(formData);
  return parsed.success ? parsed.data : null;
}

describe("client domain boundaries", () => {
  it("normaliza o cadastro mínimo do cliente", () => {
    expect(parsedClient(clientForm())).toEqual({
      address_json: null,
      commercial_status: "active",
      email: "cliente@example.test",
      kind: "company",
      links: [],
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

  it("rejeita telefone curto apontando o campo", () => {
    const rejected = parseClientForm(clientForm({ phone: "123" }));
    expect(rejected.success).toBe(false);
    // O erro precisa dizer qual campo recusou: é o que o formulário marca em vermelho.
    expect(rejected.success ? [] : rejected.error.issues.map((issue) => issue.path[0])).toContain(
      "phone",
    );
  });

  it("normaliza os links extras e ignora linhas incompletas", () => {
    const formData = clientForm();
    formData.append("linkLabel", "Painel");
    formData.append("linkUrl", " HTTPS://Painel.Exemplo.com.br/cliente/ ");
    formData.append("linkLabel", "Sem endereço");
    formData.append("linkUrl", "");
    formData.append("linkLabel", "");
    formData.append("linkUrl", "orfao.exemplo.com");

    expect(parseClientLinks(formData)).toEqual([
      { label: "Painel", url: "painel.exemplo.com.br/cliente" },
    ]);
  });

  it("limita os links extras a três", () => {
    const formData = clientForm();
    for (const index of [1, 2, 3, 4]) {
      formData.append("linkLabel", `Link ${index}`);
      formData.append("linkUrl", `link${index}.exemplo.com`);
    }

    expect(parseClientLinks(formData)).toHaveLength(3);
  });

  it("descarta links malformados vindos do banco", () => {
    expect(readClientLinks([{ label: "Ok", url: "ok.com" }, { label: 4 }, null, "texto"])).toEqual([
      { label: "Ok", url: "ok.com" },
    ]);
    expect(readClientLinks(null)).toEqual([]);
  });

  it("aceita as novas situações comerciais e recusa valores forjados", () => {
    for (const status of ["budget", "pending", "blacklist"]) {
      expect(parsedClient(clientForm({ status }))).toMatchObject({
        commercial_status: status,
      });
    }
    expect(parseClientForm(clientForm({ status: "archived" })).success).toBe(false);
    expect(parseClientForm(clientForm({ status: "forjado" })).success).toBe(false);
  });

  it("guarda somente o host do site, sem protocolo nem caminho", () => {
    expect(
      parsedClient(clientForm({ website: "HTTPS://PadariaDoJoao.com.br/menu" })),
    ).toMatchObject({ website: "padariadojoao.com.br" });
    expect(parsedClient(clientForm({ website: "" }))).toMatchObject({ website: null });
    expect(parseClientForm(clientForm({ website: "não é um site" })).success).toBe(false);
  });

  it("lê o histórico anterior somente quando há valor informado", () => {
    const withValue = clientForm();
    withValue.set("priorRevenue", "24000");
    withValue.set("priorRevenueDate", "2026-01-31");
    expect(parsePriorRevenue(withValue)).toEqual({
      data: {
        priorRevenue: 24000,
        priorRevenueDate: "2026-01-31",
      },
      success: true,
    });

    expect(parsePriorRevenue(clientForm())).toEqual({ data: null, success: true });

    const zeroed = clientForm();
    zeroed.set("priorRevenue", "0");
    zeroed.set("priorRevenueDate", "2026-01-31");
    expect(parsePriorRevenue(zeroed)).toEqual({ data: null, success: true });
  });

  it("recusa receita anterior sem uma data válida", () => {
    const missingDate = clientForm();
    missingDate.set("priorRevenue", "24000");

    const parsed = parsePriorRevenue(missingDate);
    expect(parsed.success).toBe(false);
    expect(parsed.success ? {} : parsed.error.flatten().fieldErrors).toHaveProperty(
      "priorRevenueDate",
    );
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
