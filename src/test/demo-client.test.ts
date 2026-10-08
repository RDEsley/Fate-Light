import { createDemoClient, guestReadOnlyCode } from "@/lib/demo/client";
import { buildDemoDataset, demoUserId, demoWorkspaceId } from "@/lib/demo/dataset";

const today = "2026-10-08";

function setup() {
  const data = buildDemoDataset(today);
  return { client: createDemoClient(data), data };
}

describe("demo dataset", () => {
  it("é sempre relativo a hoje e tem o que mostrar em cada tela", () => {
    const { data } = setup();

    const pending = data.charges.filter((charge) => charge.status === "pending");
    expect(pending.some((charge) => charge.due_date < today)).toBe(true);
    expect(pending.some((charge) => charge.due_date > today)).toBe(true);
    // O painel abre no mês corrente: precisa haver pagamento registrado hoje.
    expect(data.charges.some((charge) => charge.paid_at?.startsWith(today))).toBe(true);
    expect(data.expenses.some((expense) => expense.status === "paid")).toBe(true);
    expect(data.domains.some((domain) => domain.expires_on < today)).toBe(true);
    expect(data.manual_alerts).not.toHaveLength(0);
  });

  it("não reaproveita identificadores e mantém tudo no workspace fictício", () => {
    const { data } = setup();
    const ids = [
      ...data.clients,
      ...data.client_entities,
      ...data.client_services,
      ...data.charges,
      ...data.expenses,
      ...data.domains,
      ...data.manual_alerts,
    ].map((row) => row.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const row of [...data.clients, ...data.charges, ...data.expenses, ...data.domains]) {
      expect(row.workspace_id).toBe(demoWorkspaceId);
    }
    // Só domínios reservados para exemplo: nenhum e-mail ou site real.
    for (const client of data.clients) {
      if (client.email) expect(client.email).toMatch(/\.example$/);
      if (client.website) expect(client.website).toMatch(/\.example$/);
    }
  });

  it("calcula o diretório de clientes a partir das cobranças e serviços", () => {
    const { data } = setup();
    const bakery = data.client_directory.find((row) => row.name === "Padaria Pão Dourado");

    expect(bakery).toMatchObject({ active_services: 2, overdue_charges: 1, status_rank: 0 });
    expect(bakery?.lifetime_revenue).toBe(1500 + 250 + 600);
  });
});

describe("demo client — leitura", () => {
  it("filtra, ordena, pagina e conta como o PostgREST", async () => {
    const { client, data } = setup();
    const expected = data.charges.filter((charge) => charge.status === "pending");

    const {
      count,
      data: rows,
      error,
    } = await client
      .from("charges")
      .select("id, due_date", { count: "exact" })
      .eq("workspace_id", demoWorkspaceId)
      .eq("status", "pending")
      .order("due_date")
      .range(0, 1);

    expect(error).toBeNull();
    expect(count).toBe(expected.length);
    expect(rows).toHaveLength(2);
    expect(rows?.map((row) => row.due_date)).toEqual(
      expected
        .map((charge) => charge.due_date)
        .sort()
        .slice(0, 2),
    );
    expect(Object.keys(rows?.[0] ?? {})).toEqual(["id", "due_date"]);
  });

  it("resolve relações embutidas, inclusive as que devolvem lista", async () => {
    const { client } = setup();

    const { data: rows } = await client
      .from("charges")
      .select(
        "description, clients(name), client_entities(display_name), fiscal_documents(id, created_at)",
      )
      .eq("description", "Gestão de redes sociais")
      .eq("status", "pending");

    expect(rows).toEqual([
      {
        client_entities: { display_name: "Unidade Centro" },
        clients: { name: "Clínica Bem Viver" },
        description: "Gestão de redes sociais",
        fiscal_documents: [],
      },
    ]);
  });

  it("entende faixas, nulos, negação, `in`, `ilike` e a cláusula `or`", async () => {
    const { client, data } = setup();
    const bakery = data.clients[0]!.id;

    const window = await client
      .from("expenses")
      .select("id")
      .gte("due_date", today)
      .lte("due_date", "2026-10-15")
      .gt("amount", 100)
      .lt("amount", 1000);
    expect(window.data).toHaveLength(1);

    const withEntity = await client
      .from("charges")
      .select("id")
      .not("client_entity_id", "is", null);
    const withoutEntity = await client.from("charges").select("id").is("client_entity_id", null);
    expect((withEntity.data ?? []).length + (withoutEntity.data ?? []).length).toBe(
      data.charges.length,
    );

    const others = await client.from("clients").select("id").neq("id", bakery);
    expect(others.data).toHaveLength(data.clients.length - 1);

    const chosen = await client.from("clients").select("name").in("id", [bakery]);
    expect(chosen.data).toEqual([{ name: "Padaria Pão Dourado" }]);

    const search = await client
      .from("client_entities")
      .select("id")
      .ilike("display_name", "%NORTE%");
    expect(search.data).toHaveLength(1);

    // Mesmo formato que as telas montam: texto em colunas próprias ou ids relacionados.
    const combined = await client
      .from("charges")
      .select("description")
      .or(`description.ilike.%banner%,notes.ilike.%banner%,client_id.in.(${bakery})`);
    expect(combined.data?.some((row) => row.description.startsWith("Banner"))).toBe(true);
    expect(combined.data?.length).toBeGreaterThan(1);

    const literal = await client.from("clients").select("id").ilike("name", "100\\%");
    expect(literal.data).toEqual([]);
    const broken = await client.from("clients").select("id").or("sem-operador");
    expect(broken.data).toEqual([]);
  });

  it("ordena com nulos por último na crescente e devolve um registro em `single`", async () => {
    const { client, data } = setup();

    const { data: rows } = await client
      .from("charges")
      .select("id, paid_at")
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(1);
    const latest = data.charges
      .map((charge) => charge.paid_at)
      .filter(Boolean)
      .sort()
      .at(-1);
    expect(rows?.[0]?.paid_at).toBe(latest);

    const one = await client.from("workspaces").select("name").single();
    expect(one.data).toEqual({ name: "Estúdio Horizonte" });
    const none = await client.from("clients").select("id").eq("name", "Inexistente").maybeSingle();
    expect(none).toMatchObject({ data: null, error: null });
    const many = await client.from("clients").select("id").single();
    expect(many.error?.code).toBe("PGRST116");
    const unknown = await client.from("legal_documents").select("id");
    expect(unknown.data).toEqual([]);
  });

  it("reproduz os resumos do painel e dos domínios", async () => {
    const { client, data } = setup();

    const { data: summary } = await client
      .rpc("dashboard_financial_summary", {
        p_due_end: "2026-10-31",
        p_end: "2026-10-31",
        p_next_month: "2026-11-07",
        p_next_week: "2026-10-15",
        p_start: "2026-10-01",
        p_today: today,
        p_workspace_id: demoWorkspaceId,
      })
      .maybeSingle();

    expect(summary).toMatchObject({
      active_client_entities: 2,
      active_clients: 3,
      expired_domains: 1,
      overdue_charges: 2,
      overdue_expenses: 1,
    });
    // Receita própria e verba de mídia nunca se misturam (ADR-0001).
    const paidInMonth = data.charges.filter(
      (charge) => charge.status === "paid" && (charge.paid_at ?? "") >= "2026-10-01",
    );
    expect(summary?.own_received).toBe(
      paidInMonth.reduce((total, charge) => total + charge.company_revenue, 0),
    );
    expect(summary?.media_period).toBe(2000 + 1200 + 150);

    const { data: domains } = await client
      .rpc("domain_operational_summary", {
        p_next_week: "2026-10-15",
        p_today: today,
        p_workspace_id: demoWorkspaceId,
      })
      .maybeSingle();
    expect(domains).toEqual({ active_cost: 179.9, due_this_week: 1, due_today: 0, overdue: 1 });

    const lifecycle = await client.rpc("get_current_account_lifecycle_requests");
    expect(lifecycle).toMatchObject({ data: [], error: null });
  });

  it("identifica o visitante sem sessão real", async () => {
    const { client } = setup();
    const { data } = await client.auth.getClaims();

    expect(data?.claims).toMatchObject({ email: "visitante@example.com", sub: demoUserId });
  });
});

describe("demo client — somente leitura", () => {
  it("recusa toda escrita e não altera os dados", async () => {
    const { client, data } = setup();
    const before = JSON.stringify(data);
    const id = data.charges[0]!.id;

    const attempts = [
      client
        .from("clients")
        .insert({ kind: "company", name: "Novo cliente", workspace_id: demoWorkspaceId }),
      client.from("charges").update({ status: "paid" }).eq("id", id),
      client.from("charges").delete().eq("id", id),
      client.from("manual_alerts").upsert({
        due_on: today,
        title: "Lembrete",
        workspace_id: demoWorkspaceId,
      }),
      client
        .from("clients")
        .insert({ kind: "company", name: "X", workspace_id: demoWorkspaceId })
        .select()
        .single(),
      client.rpc("settle_charge_and_schedule_next", {
        p_charge_id: id,
        p_payment_method: "Pix",
      }),
      client.rpc("delete_client_record", { p_client_id: data.clients[0]!.id }),
    ];

    for (const attempt of attempts) {
      const result = await attempt;
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe(guestReadOnlyCode);
    }
    expect(JSON.stringify(data)).toBe(before);
  });

  it("recusa o armazenamento de documentos", async () => {
    const { client } = setup();
    const bucket = client.storage.from("fiscal-documents");

    for (const result of [
      await bucket.upload("caminho/nota.pdf", new Blob(["x"])),
      await bucket.createSignedUrl("caminho/nota.pdf", 60),
      await bucket.remove(["caminho/nota.pdf"]),
    ]) {
      expect(result.data).toBeNull();
      expect(result.error).toMatchObject({ code: guestReadOnlyCode });
    }
  });
});
