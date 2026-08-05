import { addDays, expiryLabel, formatCurrency, monthBounds } from "@/features/mvp/format";
import { chargeSchema, clientServiceSchema, domainSchema } from "@/features/mvp/schemas";
import { billingFrequencyLabel } from "@/features/mvp/recurrence";

describe("MVP financial boundaries", () => {
  it("mantém receita própria, mídia e adicional independentes", () => {
    const charge = chargeSchema.parse({
      additionalFee: "50",
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      clientServiceId: "",
      companyRevenue: "500",
      description: "Mensalidade",
      dueDate: "2026-08-10",
      mediaBudget: "1000",
      notes: "",
    });
    expect(charge).toMatchObject({ additionalFee: 50, companyRevenue: 500, mediaBudget: 1000 });
    expect(charge.companyRevenue + charge.additionalFee).toBe(550);
  });

  it("rejeita cobrança zerada", () => {
    expect(
      chargeSchema.safeParse({
        additionalFee: 0,
        clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        clientServiceId: "",
        companyRevenue: 0,
        description: "Mensalidade",
        dueDate: "2026-08-10",
        mediaBudget: 0,
        notes: "",
      }).success,
    ).toBe(false);
  });

  it("normaliza domínio e classifica alertas de vencimento", () => {
    const domain = domainSchema.parse({
      autoRenew: false,
      clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      cost: "",
      domain: "HTTPS://EXEMPLO.COM.BR/pagina",
      expiresOn: "2026-08-07",
      notes: "",
      paymentResponsibility: "Fate Light",
      registrar: "",
    });
    expect(domain.domain).toBe("exemplo.com.br");
    expect(expiryLabel("2026-07-30", "2026-07-31").label).toBe("Vencido");
    expect(expiryLabel("2026-08-07", "2026-07-31").label).toBe("Vence em até 7 dias");
    expect(expiryLabel("2026-08-30", "2026-07-31").label).toBe("Vence em até 30 dias");
  });

  it("calcula datas e moeda para o dashboard", () => {
    expect(addDays("2026-07-31", 7)).toBe("2026-08-07");
    expect(monthBounds(new Date("2026-07-31T12:00:00Z"))).toEqual({
      start: "2026-07-01",
      end: "2026-07-31",
    });
    expect(formatCurrency(500)).toContain("500,00");
  });

  it("aceita agendas simples do diário ao anual", () => {
    const service = clientServiceSchema.parse({
      additionalFee: 0,
      adjustmentIntervalMonths: "",
      adjustmentRate: "",
      billingType: "semiannual",
      description: "",
      discountType: "none",
      discountValue: 0,
      installmentCount: 1,
      listPrice: 500,
      mediaBudget: 0,
      name: "Manutenção",
      nextDueDate: "2027-02-03",
      notes: "",
      promotionalCycles: "",
      promotionalPrice: "",
      serviceId: "",
      startDate: "2026-08-03",
    });

    expect(service.billingType).toBe("semiannual");
    expect(billingFrequencyLabel(service.billingType)).toBe("A cada 6 meses");
  });
});
