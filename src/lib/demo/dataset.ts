import { addDays } from "@/features/mvp/format";
import type { Database } from "@/types/database.generated";

type Tables = Database["public"]["Tables"];
type Row<Name extends keyof Tables> = Tables[Name]["Row"];
type DirectoryRow = Database["public"]["Views"]["client_directory"]["Row"];

/** Identidade fixa do visitante. Nenhum destes ids existe no banco real. */
export const demoUserId = "10000000-0000-4000-8000-000000000001";
export const demoWorkspaceId = "10000000-0000-4000-8000-000000000002";
export const demoProfile = {
  email: "visitante@example.com",
  fullName: "Visitante",
  timezone: "America/Sao_Paulo",
  workspaceName: "Estúdio Horizonte",
};

const id = (group: number, index: number) =>
  `${String(group).padStart(8, "0")}-0000-4000-8000-${String(index).padStart(12, "0")}`;

const client = (index: number) => id(2, index);
const entity = (index: number) => id(3, index);
const catalog = (index: number) => id(4, index);
const service = (index: number) => id(5, index);

export type DemoDataset = ReturnType<typeof buildDemoDataset>;

/**
 * Operação fictícia de uma agência pequena, sempre relativa a hoje: há o que venceu, o
 * que vence esta semana e o que já foi pago, para toda tela ter o que mostrar. Nada aqui
 * vem do banco nem vai para ele — é só leitura, montada em memória a cada requisição.
 */
export function buildDemoDataset(today: string) {
  const day = (offset: number) => addDays(today, offset);
  const instant = (offset: number) => `${day(offset)}T12:00:00.000Z`;
  const audit = {
    created_at: instant(-400),
    created_by: demoUserId,
    updated_at: instant(-1),
    updated_by: demoUserId,
    workspace_id: demoWorkspaceId,
  };

  const clients: Row<"clients">[] = [
    {
      ...audit,
      address_json: null,
      archived_at: null,
      commercial_status: "active",
      email: "contato@paodourado.example",
      id: client(1),
      kind: "company",
      links: [{ label: "Instagram", url: "instagram.com/paodourado" }],
      name: "Padaria Pão Dourado",
      notes: "Prefere contato por WhatsApp no período da manhã.",
      phone: "(11) 98888-1010",
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: "Pão Dourado Alimentos LTDA",
      website: "paodourado.example",
    },
    {
      ...audit,
      address_json: null,
      archived_at: null,
      commercial_status: "active",
      email: "financeiro@clinicabemviver.example",
      id: client(2),
      kind: "company",
      links: [],
      name: "Clínica Bem Viver",
      notes: null,
      phone: "(11) 3333-2020",
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: "Bem Viver Saúde Integrada",
      website: "clinicabemviver.example",
    },
    {
      ...audit,
      address_json: null,
      archived_at: null,
      commercial_status: "active",
      email: "ola@verdefolha.example",
      id: client(3),
      kind: "company",
      links: [],
      name: "Loja Verde Folha",
      notes: null,
      phone: null,
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: "Verde Folha Jardinagem",
      website: "verdefolha.example",
    },
    {
      ...audit,
      address_json: null,
      archived_at: null,
      commercial_status: "pending",
      email: "contato@studiomovimento.example",
      id: client(4),
      kind: "company",
      links: [],
      name: "Studio Movimento",
      notes: "Serviço pausado até a reforma do espaço terminar.",
      phone: "(11) 97777-4040",
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: null,
      website: "studiomovimento.example",
    },
    {
      ...audit,
      address_json: null,
      archived_at: null,
      commercial_status: "budget",
      email: null,
      id: client(5),
      kind: "company",
      links: [],
      name: "Auto Center Rota 10",
      notes: "Orçamento de site e tráfego enviado; aguardando retorno.",
      phone: "(11) 96666-5050",
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: null,
      website: null,
    },
    {
      ...audit,
      address_json: null,
      archived_at: null,
      commercial_status: "inactive",
      email: "oi@cafedaesquina.example",
      id: client(6),
      kind: "company",
      links: [],
      name: "Café da Esquina",
      notes: null,
      phone: null,
      responsible_name: null,
      tags: [],
      tax_id: null,
      trade_name: null,
      website: "cafedaesquina.example",
    },
  ];

  const clientEntities: Row<"client_entities">[] = [
    ["Unidade Centro", 1],
    ["Unidade Zona Norte", 2],
  ].map(([displayName, index]) => ({
    ...audit,
    archived_at: null,
    client_id: client(2),
    display_name: String(displayName),
    email: null,
    entity_type: "company",
    id: entity(Number(index)),
    legal_name: null,
    notes: null,
    phone: null,
    status: "active",
    tax_id: null,
    website: null,
  }));

  const catalogItem = (
    index: number,
    name: string,
    price: number,
    billing: string,
    description: string,
    adjustment: [number, number] | null = null,
  ): Row<"services"> => ({
    ...audit,
    active: true,
    archived_at: null,
    default_adjustment_interval_months: adjustment?.[0] ?? null,
    default_adjustment_rate: adjustment?.[1] ?? null,
    default_billing_type: billing,
    default_component_kind: "service",
    default_financial_nature: "own_revenue",
    default_price: price,
    description,
    id: catalog(index),
    name,
  });

  const services: Row<"services">[] = [
    catalogItem(
      1,
      "Gestão de tráfego pago",
      1500,
      "monthly",
      "Campanhas e relatório mensal",
      [12, 5.5],
    ),
    catalogItem(2, "Gestão de redes sociais", 1200, "monthly", "Planejamento, posts e respostas"),
    catalogItem(3, "Site institucional", 4800, "single", "Projeto, layout e publicação"),
    catalogItem(4, "Manutenção de site", 250, "monthly", "Atualizações e backup"),
  ];

  const clientService = (
    index: number,
    values: Pick<Row<"client_services">, "client_id" | "name" | "list_price" | "start_date"> &
      Partial<Row<"client_services">>,
  ): Row<"client_services"> => ({
    ...audit,
    additional_fee: 0,
    additional_fee_is_revenue: true,
    adjustment_interval_months: null,
    adjustment_rate: null,
    billing_type: "monthly",
    client_entity_id: null,
    company_revenue: values.list_price,
    description: null,
    discount_type: "none",
    discount_value: 0,
    ended_at: null,
    id: service(index),
    installment_count: 1,
    media_budget: 0,
    next_adjustment_date: null,
    next_due_date: null,
    notes: null,
    promotional_cycles: null,
    promotional_cycles_used: 0,
    promotional_price: null,
    service_id: null,
    status: "active",
    ...values,
  });

  const clientServices: Row<"client_services">[] = [
    clientService(1, {
      adjustment_interval_months: 12,
      adjustment_rate: 5.5,
      client_id: client(1),
      list_price: 1500,
      media_budget: 2000,
      name: "Gestão de tráfego pago",
      next_adjustment_date: day(165),
      next_due_date: day(26),
      service_id: catalog(1),
      start_date: day(-200),
    }),
    clientService(2, {
      client_id: client(1),
      list_price: 250,
      name: "Manutenção de site",
      next_due_date: day(12),
      service_id: catalog(4),
      start_date: day(-320),
    }),
    clientService(3, {
      client_entity_id: entity(1),
      client_id: client(2),
      company_revenue: 1080,
      discount_type: "percentage",
      discount_value: 10,
      list_price: 1200,
      name: "Gestão de redes sociais",
      next_due_date: day(3),
      service_id: catalog(2),
      start_date: day(-95),
    }),
    clientService(4, {
      client_entity_id: entity(2),
      client_id: client(2),
      list_price: 1500,
      media_budget: 1200,
      name: "Gestão de tráfego pago",
      next_due_date: day(18),
      promotional_cycles: 3,
      promotional_cycles_used: 2,
      promotional_price: 900,
      service_id: catalog(1),
      start_date: day(-40),
    }),
    clientService(5, {
      billing_type: "single",
      client_id: client(3),
      installment_count: 4,
      list_price: 4800,
      name: "Site institucional",
      next_due_date: day(21),
      service_id: catalog(3),
      start_date: day(-70),
    }),
    clientService(6, {
      client_id: client(4),
      list_price: 1200,
      name: "Gestão de redes sociais",
      service_id: catalog(2),
      start_date: day(-150),
      status: "paused",
    }),
  ];

  const charge = (
    index: number,
    values: Pick<Row<"charges">, "client_id" | "company_revenue" | "description" | "due_date"> &
      Partial<Row<"charges">>,
  ): Row<"charges"> => {
    const row = {
      ...audit,
      additional_fee: 0,
      additional_fee_is_revenue: true,
      cancel_reason: null,
      cancel_reason_code: null,
      cancelled_at: null,
      client_entity_id: null,
      client_service_id: null,
      delay_reason: null,
      delay_reason_code: null,
      delay_recorded_at: null,
      id: id(6, index),
      media_budget: 0,
      notes: null,
      paid_at: null,
      payment_method: null,
      status: "pending",
      ...values,
    };
    return {
      ...row,
      gross_total: row.company_revenue + row.media_budget + row.additional_fee,
    };
  };
  const paid = (offset: number, method: string) => ({
    paid_at: instant(offset),
    payment_method: method,
    status: "paid",
  });

  const charges: Row<"charges">[] = [
    charge(1, {
      client_id: client(1),
      client_service_id: service(1),
      company_revenue: 1500,
      description: "Gestão de tráfego pago",
      due_date: day(-4),
      media_budget: 2000,
    }),
    charge(2, {
      client_id: client(3),
      client_service_id: service(5),
      company_revenue: 1200,
      delay_reason: "Cliente pediu mais prazo",
      delay_reason_code: "client_requested",
      delay_recorded_at: instant(-6),
      description: "Site institucional — parcela 3 de 4",
      due_date: day(-9),
    }),
    charge(3, {
      client_entity_id: entity(1),
      client_id: client(2),
      client_service_id: service(3),
      company_revenue: 1080,
      description: "Gestão de redes sociais",
      due_date: day(3),
    }),
    charge(4, {
      additional_fee: 150,
      additional_fee_is_revenue: false,
      client_id: client(3),
      company_revenue: 450,
      description: "Banner para campanha de inverno",
      due_date: day(1),
    }),
    charge(5, {
      client_id: client(1),
      client_service_id: service(2),
      company_revenue: 250,
      description: "Manutenção de site",
      due_date: day(12),
    }),
    charge(6, {
      client_entity_id: entity(2),
      client_id: client(2),
      client_service_id: service(4),
      company_revenue: 900,
      description: "Gestão de tráfego pago",
      due_date: day(18),
      media_budget: 1200,
    }),
    charge(7, {
      client_id: client(1),
      client_service_id: service(1),
      company_revenue: 1500,
      description: "Gestão de tráfego pago",
      due_date: day(-34),
      media_budget: 2000,
      ...paid(-33, "Pix"),
    }),
    charge(8, {
      client_entity_id: entity(1),
      client_id: client(2),
      client_service_id: service(3),
      company_revenue: 1080,
      description: "Gestão de redes sociais",
      due_date: day(-27),
      ...paid(-27, "Boleto"),
    }),
    charge(9, {
      client_id: client(3),
      client_service_id: service(5),
      company_revenue: 1200,
      description: "Site institucional — parcela 2 de 4",
      due_date: day(-39),
      ...paid(-38, "Pix"),
    }),
    charge(10, {
      client_id: client(1),
      client_service_id: service(2),
      company_revenue: 250,
      description: "Manutenção de site",
      due_date: day(-18),
      ...paid(-17, "Pix"),
    }),
    charge(11, {
      client_entity_id: entity(2),
      client_id: client(2),
      client_service_id: service(4),
      company_revenue: 900,
      description: "Gestão de tráfego pago",
      due_date: day(-12),
      media_budget: 1200,
      ...paid(-11, "Cartão"),
    }),
    charge(13, {
      client_entity_id: entity(2),
      client_id: client(2),
      company_revenue: 1900,
      description: "Landing page da campanha de check-up",
      due_date: day(-2),
      ...paid(-1, "Pix"),
    }),
    charge(14, {
      client_id: client(1),
      company_revenue: 600,
      description: "Consultoria de anúncios",
      due_date: day(0),
      ...paid(0, "Pix"),
    }),
    charge(15, {
      client_id: client(3),
      company_revenue: 950,
      description: "Identidade visual da loja",
      due_date: day(-3),
      ...paid(-3, "Transferência"),
    }),
    charge(16, {
      client_id: client(3),
      client_service_id: service(5),
      company_revenue: 1200,
      description: "Site institucional — parcela 1 de 4",
      due_date: day(-69),
      ...paid(-69, "Pix"),
    }),
    charge(12, {
      cancel_reason: "Serviço pausado a pedido do cliente",
      cancel_reason_code: "renegotiated",
      cancelled_at: instant(-19),
      client_id: client(4),
      client_service_id: service(6),
      company_revenue: 1200,
      description: "Gestão de redes sociais",
      due_date: day(-20),
      status: "cancelled",
    }),
  ];

  const expense = (
    index: number,
    values: Pick<Row<"expenses">, "amount" | "category" | "description" | "due_date"> &
      Partial<Row<"expenses">>,
  ): Row<"expenses"> => ({
    ...audit,
    client_entity_id: null,
    client_id: null,
    expense_type: "fixed",
    id: id(7, index),
    notes: null,
    paid_at: null,
    recurrence_active: false,
    recurrence_frequency: null,
    recurrence_group_id: null,
    recurrence_sequence: null,
    status: "pending",
    ...values,
  });
  const monthly = (group: number, sequence: number) => ({
    recurrence_active: true,
    recurrence_frequency: "monthly",
    recurrence_group_id: id(8, group),
    recurrence_sequence: sequence,
  });

  const expenses: Row<"expenses">[] = [
    expense(1, {
      amount: 249,
      category: "tools",
      description: "Ferramenta de automação",
      due_date: day(-2),
      ...monthly(2, 5),
    }),
    expense(2, {
      amount: 189.9,
      category: "hosting",
      description: "Hospedagem dos sites",
      due_date: day(5),
      ...monthly(1, 4),
    }),
    expense(3, {
      amount: 800,
      category: "staff_contractors",
      client_entity_id: entity(1),
      client_id: client(2),
      description: "Freelancer — vídeo institucional",
      due_date: day(8),
      expense_type: "variable",
    }),
    expense(4, {
      amount: 120,
      category: "artificial_intelligence",
      description: "Assinatura de IA",
      due_date: day(15),
      ...monthly(3, 2),
    }),
    expense(5, {
      amount: 300,
      category: "marketing",
      client_id: client(1),
      description: "Impulsionamento extra",
      due_date: day(-14),
      expense_type: "variable",
      paid_at: instant(-14),
      status: "paid",
    }),
    expense(6, {
      amount: 189.9,
      category: "hosting",
      description: "Hospedagem dos sites",
      due_date: day(-25),
      paid_at: instant(-25),
      status: "paid",
      ...monthly(1, 3),
    }),
    expense(8, {
      amount: 450,
      category: "other",
      description: "Contabilidade",
      due_date: day(-1),
      paid_at: instant(-1),
      status: "paid",
      ...monthly(4, 6),
    }),
    expense(9, {
      amount: 89.9,
      category: "tools",
      description: "Banco de imagens",
      due_date: day(0),
      paid_at: instant(0),
      status: "paid",
      ...monthly(5, 3),
    }),
    expense(7, {
      amount: 249,
      category: "tools",
      description: "Ferramenta de automação",
      due_date: day(-32),
      paid_at: instant(-31),
      status: "paid",
      ...monthly(2, 4),
    }),
  ];

  const domain = (
    index: number,
    values: Pick<Row<"domains">, "client_id" | "domain" | "expires_on"> & Partial<Row<"domains">>,
  ): Row<"domains"> => ({
    ...audit,
    auto_renew: false,
    client_entity_id: null,
    cost: 40,
    id: id(9, index),
    notes: null,
    payment_responsibility: "Cliente",
    registrar: "registro.br",
    status: "active",
    ...values,
  });

  const domains: Row<"domains">[] = [
    domain(1, { client_id: client(4), domain: "studiomovimento.example", expires_on: day(-3) }),
    domain(2, {
      client_id: client(1),
      domain: "paodourado.example",
      expires_on: day(5),
      notes: "Renovação combinada para ser repassada na próxima mensalidade.",
      payment_responsibility: "Estúdio Horizonte",
    }),
    domain(3, {
      auto_renew: true,
      client_entity_id: entity(1),
      client_id: client(2),
      domain: "clinicabemviver.example",
      expires_on: day(21),
    }),
    domain(4, {
      client_id: client(3),
      cost: 59.9,
      domain: "verdefolha.example",
      expires_on: day(190),
    }),
    domain(5, {
      client_id: client(6),
      domain: "cafedaesquina.example",
      expires_on: day(90),
      status: "cancelled",
    }),
  ];

  const manualAlerts: Row<"manual_alerts">[] = [
    {
      ...audit,
      client_id: client(2),
      due_on: day(-1),
      id: id(10, 1),
      notes: "Consolidar resultados de tráfego e redes da Clínica Bem Viver.",
      recurrence: "none",
      resolved_at: null,
      severity: "danger",
      state: "open",
      title: "Enviar relatório trimestral",
    },
    {
      ...audit,
      client_id: client(1),
      due_on: day(4),
      id: id(10, 2),
      notes: null,
      recurrence: "annual",
      resolved_at: null,
      severity: "warning",
      state: "open",
      title: "Renovar contrato da Padaria Pão Dourado",
    },
  ];

  const activity = (
    index: number,
    offset: number,
    entityType: string,
    action: string,
    summary: string,
    clientId: string | null,
  ): Row<"activity_events"> => ({
    action,
    actor_user_id: demoUserId,
    client_id: clientId,
    entity_id: id(11, index),
    entity_type: entityType,
    event_data: {},
    id: id(12, index),
    occurred_at: instant(offset),
    summary,
    workspace_id: demoWorkspaceId,
  });

  const activityEvents: Row<"activity_events">[] = [
    activity(9, 0, "charge", "paid", "Pagamento registrado: Consultoria de anúncios", client(1)),
    activity(
      10,
      -1,
      "charge",
      "paid",
      "Pagamento registrado: Landing page da campanha de check-up",
      client(2),
    ),
    activity(
      1,
      -1,
      "charge",
      "created",
      "Cobrança avulsa criada: Banner para campanha de inverno",
      client(3),
    ),
    activity(
      2,
      -6,
      "charge",
      "updated",
      "Motivo do atraso registrado em Site institucional",
      client(3),
    ),
    activity(3, -11, "charge", "paid", "Pagamento registrado: Gestão de tráfego pago", client(2)),
    activity(4, -14, "expense", "paid", "Despesa paga: Impulsionamento extra", client(1)),
    activity(5, -17, "charge", "paid", "Pagamento registrado: Manutenção de site", client(1)),
    activity(
      6,
      -19,
      "charge",
      "cancelled",
      "Cobrança cancelada: Gestão de redes sociais",
      client(4),
    ),
    activity(
      7,
      -40,
      "client_service",
      "created",
      "Serviço aplicado: Gestão de tráfego pago",
      client(2),
    ),
    activity(8, -70, "client", "created", "Cliente criado: Loja Verde Folha", client(3)),
  ];

  const ownRevenue = (row: Row<"charges">) =>
    row.company_revenue + (row.additional_fee_is_revenue ? row.additional_fee : 0);
  const statusRank: Record<string, number> = { active: 0, pending: 1, budget: 2, inactive: 3 };

  const clientDirectory: DirectoryRow[] = clients.map((entry) => {
    const own = clientServices.filter((item) => item.client_id === entry.id);
    return {
      active_services: own.filter((item) => item.status === "active").length,
      archived_at: entry.archived_at,
      commercial_status: entry.commercial_status,
      email: entry.email,
      expiring_domains: domains.filter(
        (item) =>
          item.client_id === entry.id && item.status === "active" && item.expires_on <= day(30),
      ).length,
      first_service_start: own.map((item) => item.start_date).sort()[0] ?? null,
      id: entry.id,
      lifetime_revenue: charges
        .filter((item) => item.client_id === entry.id && item.status === "paid")
        .reduce((total, item) => total + ownRevenue(item), 0),
      links: entry.links,
      name: entry.name,
      notes: entry.notes,
      overdue_charges: charges.filter(
        (item) => item.client_id === entry.id && item.status === "pending" && item.due_date < today,
      ).length,
      phone: entry.phone,
      status_rank: statusRank[entry.commercial_status] ?? 9,
      trade_name: entry.trade_name,
      website: entry.website,
      workspace_id: demoWorkspaceId,
    };
  });

  const profiles: Row<"profiles">[] = [
    {
      account_status: "active",
      created_at: audit.created_at,
      full_name: demoProfile.fullName,
      id: demoUserId,
      last_seen_at: null,
      locale: "pt-BR",
      phone: null,
      theme: "light",
      timezone: demoProfile.timezone,
      updated_at: audit.updated_at,
    },
  ];

  const workspaces: Row<"workspaces">[] = [
    {
      archived_at: null,
      created_at: audit.created_at,
      created_by: demoUserId,
      currency: "BRL",
      id: demoWorkspaceId,
      name: demoProfile.workspaceName,
      status: "active",
      timezone: demoProfile.timezone,
      updated_at: audit.updated_at,
    },
  ];

  const workspaceSettings: Row<"workspace_settings">[] = [
    {
      accounting_basis: "cash",
      address_city: "São Paulo",
      address_district: "Centro",
      address_line1: "Rua das Flores, 100",
      address_line2: null,
      address_region: "SP",
      country_code: "BR",
      created_at: audit.created_at,
      date_format: "DD/MM/YYYY",
      default_alert_offsets: [1, 7, 15, 30],
      general_settings: {},
      legal_name: "Estúdio Horizonte Marketing LTDA",
      postal_code: "01000-000",
      tax_id: null,
      trade_name: demoProfile.workspaceName,
      updated_at: audit.updated_at,
      workspace_id: demoWorkspaceId,
    },
  ];

  return {
    activity_events: activityEvents,
    charges,
    client_directory: clientDirectory,
    client_entities: clientEntities,
    client_services: clientServices,
    clients,
    domains,
    expenses,
    fiscal_documents: [],
    import_jobs: [],
    manual_alerts: manualAlerts,
    profiles,
    services,
    workspace_settings: workspaceSettings,
    workspaces,
  };
}
