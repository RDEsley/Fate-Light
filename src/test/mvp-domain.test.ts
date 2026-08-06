import {
  addDays,
  dashboardPeriodBounds,
  expiryLabel,
  formatCurrency,
  monthBounds,
} from "@/features/mvp/format";
import {
  chargeSchema,
  clientServiceSchema,
  domainSchema,
  ownRevenue,
} from "@/features/mvp/schemas";
import { billingFrequencyLabel } from "@/features/mvp/recurrence";

describe("MVP financial boundaries", () => {
  const baseCharge = {
    additionalFee: "50",
    alreadyPaid: false,
    clientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    clientServiceId: "",
    companyRevenue: "500",
    description: "Mensalidade",
    dueDate: "2026-08-10",
    mediaBudget: "1000",
    notes: "",
    paymentMethod: "",
  };

  it("mantém receita própria, mídia e adicional independentes", () => {
    const charge = chargeSchema.parse(baseCharge);
    expect(charge).toMatchObject({ additionalFee: 50, companyRevenue: 500, mediaBudget: 1000 });
    expect(charge.companyRevenue + charge.additionalFee).toBe(550);
  });

  it("conta o adicional como receita só quando ele é declarado como tal", () => {
    const base = { additional_fee: 50, company_revenue: 500 };
    // Sem declaração vale o default da coluna: receita própria, que é o comportamento
    // que o dashboard já praticava antes da ADR-0018.
    expect(ownRevenue(base)).toBe(550);
    expect(ownRevenue({ ...base, additional_fee_is_revenue: true })).toBe(550);
    // Repasse acompanha a verba de mídia e nunca compõe faturamento (ADR-0001).
    expect(ownRevenue({ ...base, additional_fee_is_revenue: false })).toBe(500);
  });

  it("assume receita própria quando o formulário não declara a natureza do adicional", () => {
    expect(chargeSchema.parse(baseCharge).additionalFeeIsRevenue).toBe(true);
    expect(
      chargeSchema.parse({ ...baseCharge, additionalFeeIsRevenue: "passthrough" })
        .additionalFeeIsRevenue,
    ).toBe(false);
  });

  it("rejeita cobrança zerada", () => {
    expect(
      chargeSchema.safeParse({
        ...baseCharge,
        additionalFee: 0,
        companyRevenue: 0,
        mediaBudget: 0,
      }).success,
    ).toBe(false);
  });

  it("exige forma de pagamento ao registrar cobrança já quitada", () => {
    expect(chargeSchema.safeParse({ ...baseCharge, alreadyPaid: true }).success).toBe(false);
    expect(
      chargeSchema.safeParse({ ...baseCharge, alreadyPaid: true, paymentMethod: "Pix" }).success,
    ).toBe(true);
  });

  it("aceita ciclo promocional gratuito com quantidade de ciclos", () => {
    const free = clientServiceSchema.safeParse({
      additionalFee: 0,
      adjustmentIntervalMonths: "",
      adjustmentRate: "",
      billingType: "monthly",
      description: "",
      discountType: "none",
      discountValue: 0,
      installmentCount: 1,
      listPrice: 1000,
      mediaBudget: 0,
      name: "Gestão de tráfego",
      nextDueDate: "2026-08-05",
      notes: "",
      promotionalCycles: "4",
      promotionalPrice: "0",
      serviceId: "",
      startDate: "2025-12-01",
    });

    expect(free.success).toBe(true);
    expect(free.data).toMatchObject({ promotionalCycles: 4, promotionalPrice: 0 });
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

  it("limita o vencimento pendente do dashboard ao período escolhido", () => {
    const today = "2026-08-06";
    // "Este mês" cobre o mês inteiro, mas não uma cobrança de daqui a 4 meses — era
    // esse teto ausente que fazia "Receita própria pendente" somar qualquer vencimento.
    const month = dashboardPeriodBounds("month", today);
    expect(month).toEqual({ dueEnd: "2026-08-31", end: "2026-08-31", start: "2026-08-01" });
    expect("2026-12-06" >= month.start && "2026-12-06" <= month.dueEnd).toBe(false);

    // "Todo o período" não pode ter teto de vencimento, senão a mesma cobrança futura
    // ficaria de fora mesmo sem filtro de tempo nenhum selecionado.
    const all = dashboardPeriodBounds("all", today);
    expect(all.end).toBe(today);
    expect("2026-12-06" <= all.dueEnd).toBe(true);

    // Períodos de N dias olham pra trás a partir de hoje.
    expect(dashboardPeriodBounds("7d", today)).toEqual({
      dueEnd: today,
      end: today,
      start: "2026-07-31",
    });
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
