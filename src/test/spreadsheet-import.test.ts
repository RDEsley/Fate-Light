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
