import { normalizeWorkbook, parseCsv } from "@/features/import/spreadsheet";

describe("spreadsheet import normalization", () => {
  it("normaliza CSV canônico com relações financeiras", () => {
    const csv = [
      '"Tipo","Cliente","Empresa","Status","Serviço","Descrição","Receita própria","Verba de mídia","Adicional","Tipo de cobrança","Data inicial","Próximo vencimento","Vencimento","Categoria","Valor","Tipo de despesa","Domínio","Expiração"',
      '"cliente","Acme","Acme Ltda","ativo","","","","","","","","","","","","","",""',
      '"serviço","Acme","","","Gestão","Mensal","500,00","1.000,00","25,00","mensal","01/08/2026","01/09/2026","","","","","",""',
      '"cobrança","Acme","","pendente","Gestão","Mensalidade","500,00","1.000,00","25,00","","","","05/09/2026","","","","",""',
      '"despesa","Acme","","pendente","","Software","","","","","","","06/09/2026","software","120,50","fixa","",""',
      '"domínio","Acme","","","","","","","","","","","","","","","acme.example","01/08/2027"',
    ].join("\r\n");

    const result = normalizeWorkbook(parseCsv(csv));

    expect(result.issues.filter(({ level }) => level === "error")).toEqual([]);
    expect(result.rowCount).toBe(5);
    expect(result.payload.services[0]).toMatchObject({
      billingType: "monthly",
      companyRevenue: "500.00",
      mediaBudget: "1000.00",
      startDate: "2026-08-01",
    });
    expect(result.payload.charges[0].dueDate).toBe("2026-09-05");
    expect(result.payload.expenses[0]).toMatchObject({ amount: "120.50", category: "software" });
    expect(result.payload.domains[0].domain).toBe("acme.example");
  });

  it("lê linhas Empresa/Marca sem mudar o significado da coluna Empresa no cliente", () => {
    const csv = [
      '"Tipo","Cliente","Empresa","Status","Tipo de empresa","Observações"',
      '"cliente","Acme","Acme Ltda","ativo","",""',
      '"empresa/marca","Acme","Padaria do Bairro","","marca","Loja da rua 2"',
      '"entidade","Acme","Oficina Central","","projeto",""',
    ].join("\r\n");

    const result = normalizeWorkbook(parseCsv(csv));

    expect(result.issues.filter(({ level }) => level === "error")).toEqual([]);
    // A coluna Empresa continua sendo nome fantasia na linha de cliente.
    expect(result.payload.clients[0].companyName).toBe("Acme Ltda");
    expect(result.entities).toEqual([
      {
        clientName: "Acme",
        displayName: "Padaria do Bairro",
        entityType: "brand",
        notes: "Loja da rua 2",
      },
      { clientName: "Acme", displayName: "Oficina Central", entityType: "project", notes: "" },
    ]);
    expect(result.rowCount).toBe(3);
  });

  it("preserva Empresa/Marca em serviços, cobranças e despesas idênticos de duas empresas", () => {
    const csv = [
      '"Tipo","Cliente","Empresa/Marca","Status","Serviço","Descrição","Receita própria","Verba de mídia","Adicional","Tipo de cobrança","Data inicial","Próximo vencimento","Vencimento","Categoria","Valor","Tipo de despesa"',
      '"cliente","Richard","","ativo","","","","","","","","","","","",""',
      '"empresa/marca","Richard","DX Dedetizadora","","","","","","","","","","","","",""',
      '"empresa/marca","Richard","Fate Eight Tech","","","","","","","","","","","","",""',
      '"serviço","Richard","DX Dedetizadora","","Gestão Ads","Mensal","200,00","0,00","0,00","mensal","01/10/2026","01/11/2026","","","",""',
      '"serviço","Richard","Fate Eight Tech","","Gestão Ads","Mensal","300,00","0,00","0,00","mensal","01/10/2026","01/11/2026","","","",""',
      '"cobrança","Richard","DX Dedetizadora","pendente","Gestão Ads","Mensalidade Ads","200,00","0,00","0,00","","","","01/11/2026","","",""',
      '"cobrança","Richard","Fate Eight Tech","pendente","Gestão Ads","Mensalidade Ads","300,00","0,00","0,00","","","","01/11/2026","","",""',
      '"despesa","Richard","DX Dedetizadora","pendente","","Ferramenta","","","","","","","02/11/2026","software","50,00","variavel"',
      '"despesa","Richard","Fate Eight Tech","pendente","","Ferramenta","","","","","","","02/11/2026","software","50,00","variavel"',
    ].join("\r\n");

    const result = normalizeWorkbook(parseCsv(csv));

    expect(result.issues.filter(({ level }) => level === "error")).toEqual([]);
    expect(result.payload.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clientEntityName: "DX Dedetizadora",
          clientName: "Richard",
          name: "Gestão Ads",
          startDate: "2026-10-01",
        }),
        expect.objectContaining({
          clientEntityName: "Fate Eight Tech",
          clientName: "Richard",
          name: "Gestão Ads",
          startDate: "2026-10-01",
        }),
      ]),
    );
    expect(result.payload.charges).toHaveLength(2);
    expect(result.payload.charges.map((charge) => charge.clientEntityName).sort()).toEqual([
      "DX Dedetizadora",
      "Fate Eight Tech",
    ]);
    expect(result.payload.expenses).toHaveLength(2);
    expect(result.payload.expenses.every((expense) => expense.description === "Ferramenta")).toBe(
      true,
    );
    expect(result.payload.services.every((service) => service.clientEntityName === "")).toBe(false);
  });

  it("reconhece e sinaliza a planilha legada antes de importar", () => {
    const csv = [
      '"Client","Start Date","Service DEV","Service Value","Payment type","Next pay/ mens/","Expenses","DOMAIN EXPIRATION"',
      '"Cliente legado","2026-08-01","Landing Page","900","single","2026-09-01","80","2027-08-01"',
    ].join("\n");

    const result = normalizeWorkbook(parseCsv(csv));

    expect(result.legacy).toBe(true);
    expect(result.payload.clients).toHaveLength(1);
    expect(result.payload.services[0]).toMatchObject({
      name: "Landing Page",
      companyRevenue: "900.00",
    });
    expect(result.payload.expenses[0]).toMatchObject({ amount: "80.00", status: "pending" });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warning",
          message: expect.stringMatching(/formato legado/i),
        }),
        expect.objectContaining({
          level: "warning",
          message: expect.stringMatching(/nome do domínio/i),
        }),
      ]),
    );
  });

  it("bloqueia arquivo sem contrato reconhecido", () => {
    const result = normalizeWorkbook(parseCsv('"Nome","Valor"\n"Sem tipo","10"'));

    expect(result.rowCount).toBe(0);
    expect(result.issues[0]).toMatchObject({ level: "error", sheet: "Arquivo" });
  });
});
