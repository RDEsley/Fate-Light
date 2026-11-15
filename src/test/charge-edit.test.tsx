import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
  };
  query.eq.mockImplementation(() => query);
  query.select.mockImplementation(() => query);
  const entityQuery = { eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn(), select: vi.fn() };
  entityQuery.eq.mockImplementation(() => entityQuery);
  entityQuery.is.mockImplementation(() => entityQuery);
  entityQuery.select.mockImplementation(() => entityQuery);
  return {
    entityQuery,
    from: vi.fn(),
    query,
    redirect: vi.fn((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    }),
    revalidatePath: vi.fn(),
    rpc: vi.fn(),
    update: vi.fn(() => query),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: mocks.from, rpc: mocks.rpc },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceTimezone: "America/Sao_Paulo",
  })),
}));

import { markChargePaid, markExpensePaid, updateCharge, updateExpense } from "@/app/_actions/mvp";
import { EditChargeButton, type EditableCharge } from "@/app/cobrancas/edit-charge-button";
import { initialActionState } from "@/lib/forms/action-state";

const chargeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const clientId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function editForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    additionalFee: "0",
    additionalFeeNature: "revenue",
    companyRevenue: "450.00",
    description: "Mensalidade de novembro",
    dueDate: "2026-11-20",
    id: chargeId,
    mediaBudget: "0",
    notes: "",
    returnTo: "/cobrancas",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("updateCharge", () => {
  beforeEach(() => {
    mocks.from
      .mockReset()
      .mockImplementation((table: string) =>
        table === "client_entities" ? mocks.entityQuery : { update: mocks.update },
      );
    mocks.entityQuery.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
    mocks.update.mockClear();
    mocks.query.eq.mockClear();
    mocks.query.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: { client_id: clientId, id: chargeId }, error: null });
  });

  it("grava vencimento e valores só na cobrança pendente do workspace da sessão", async () => {
    await expect(updateCharge(initialActionState, editForm())).rejects.toThrow(
      `REDIRECT:/cobrancas?focus=${chargeId}&status=charge-updated`,
    );
    expect(mocks.update).toHaveBeenCalledWith({
      additional_fee: 0,
      additional_fee_is_revenue: true,
      company_revenue: 450,
      description: "Mensalidade de novembro",
      due_date: "2026-11-20",
      media_budget: 0,
      notes: null,
    });
    expect(mocks.query.eq).toHaveBeenCalledWith("id", chargeId);
    expect(mocks.query.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(mocks.query.eq).toHaveBeenCalledWith("status", "pending");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/clientes/${clientId}`);
  });

  it("não mexe na empresa/marca quando o formulário não oferece a troca", async () => {
    await expect(updateCharge(initialActionState, editForm())).rejects.toThrow("REDIRECT:");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ client_entity_id: expect.anything() }),
    );
    expect(mocks.from).not.toHaveBeenCalledWith("client_entities");
  });

  it("troca a empresa/marca só por uma do mesmo cliente", async () => {
    const entityId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    mocks.entityQuery.maybeSingle.mockResolvedValue({ data: { id: entityId }, error: null });

    await expect(
      updateCharge(initialActionState, editForm({ clientEntityId: entityId, clientId })),
    ).rejects.toThrow("REDIRECT:");
    expect(mocks.entityQuery.eq).toHaveBeenCalledWith("client_id", clientId);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ client_entity_id: entityId }),
    );
    expect(mocks.query.eq).toHaveBeenCalledWith("client_id", clientId);
  });

  it("recusa empresa/marca de outro cliente", async () => {
    const state = await updateCharge(
      initialActionState,
      editForm({ clientEntityId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", clientId }),
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("clientEntityId");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("volta para a ficha quando a edição nasceu nela", async () => {
    await expect(
      updateCharge(initialActionState, editForm({ returnTo: `/clientes/${clientId}` })),
    ).rejects.toThrow(`REDIRECT:/clientes/${clientId}?status=charge-updated`);
  });

  it("recusa cobrança sem valor e não toca no banco", async () => {
    const state = await updateCharge(initialActionState, editForm({ companyRevenue: "0" }));

    expect(state.status).toBe("error");
    expect(state.fieldErrors).toHaveProperty("companyRevenue");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("avisa quando a cobrança já não está pendente em vez de reescrevê-la", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });

    const state = await updateCharge(initialActionState, editForm());

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/não está mais pendente/i);
  });
});

describe("updateExpense", () => {
  const expenseForm = () => {
    const form = new FormData();
    form.set("amount", "89.90");
    form.set("category", "hosting");
    form.set("description", "Hospedagem anual");
    form.set("dueDate", "2026-12-05");
    form.set("id", chargeId);
    form.set("notes", "");
    return form;
  };

  beforeEach(() => {
    mocks.from.mockReset().mockReturnValue({ update: mocks.update });
    mocks.update.mockClear();
    mocks.query.eq.mockClear();
    mocks.query.maybeSingle
      .mockReset()
      .mockResolvedValue({ data: { client_id: null, id: chargeId }, error: null });
  });

  it("corrige só a despesa a pagar do workspace da sessão", async () => {
    await expect(updateExpense(initialActionState, expenseForm())).rejects.toThrow(
      `REDIRECT:/despesas?focus=${chargeId}&status=expense-updated`,
    );
    expect(mocks.from).toHaveBeenCalledWith("expenses");
    expect(mocks.update).toHaveBeenCalledWith({
      amount: 89.9,
      category: "hosting",
      description: "Hospedagem anual",
      due_date: "2026-12-05",
      notes: null,
    });
    expect(mocks.query.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("não reescreve despesa já paga", async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });

    const state = await updateExpense(initialActionState, expenseForm());

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/não está mais a pagar/i);
  });
});

describe("data do pagamento na baixa", () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: { status: "settled" }, error: null });
    vi.useFakeTimers({ now: new Date("2026-11-15T15:00:00Z"), toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  const settleForm = (paidOn: string) => {
    const form = new FormData();
    form.set("id", chargeId);
    form.set("paymentMethod", "Pix");
    form.set("paidOn", paidOn);
    form.set("returnTo", "/alertas");
    return form;
  };

  it("envia o dia informado para a baixa da cobrança", async () => {
    await expect(markChargePaid(settleForm("2026-11-03"))).rejects.toThrow(
      "REDIRECT:/alertas?status=paid",
    );
    expect(mocks.rpc).toHaveBeenCalledWith("settle_charge_and_schedule_next", {
      p_charge_id: chargeId,
      p_paid_on: "2026-11-03",
      p_payment_method: "Pix",
    });
  });

  it("recusa pagamento no futuro sem chamar o banco", async () => {
    await expect(markChargePaid(settleForm("2026-11-20"))).rejects.toThrow(
      "REDIRECT:/alertas?status=payment-date-invalid",
    );
    await expect(markExpensePaid(settleForm("2026-11-20"))).rejects.toThrow(
      "REDIRECT:/alertas?status=payment-date-invalid",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("sem data, a despesa é paga agora", async () => {
    const form = settleForm("");
    await expect(markExpensePaid(form)).rejects.toThrow("REDIRECT:/alertas?status=paid");
    expect(mocks.rpc).toHaveBeenCalledWith("settle_expense_and_schedule_next", {
      p_expense_id: chargeId,
      p_paid_on: undefined,
    });
  });
});

describe("EditChargeButton", () => {
  const charge: EditableCharge = {
    additionalFee: "30.00",
    additionalFeeIsRevenue: false,
    clientId,
    clientServiceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    companyRevenue: "300.00",
    description: "Gestão de tráfego",
    dueDate: "2026-11-10",
    id: chargeId,
    mediaBudget: "0",
    notes: "Combinado por telefone",
  };

  it("abre a edição já preenchida e explica que a agenda do serviço acompanha", () => {
    render(<EditChargeButton charge={charge} returnTo="/cobrancas" />);

    fireEvent.click(screen.getByRole("button", { name: "Editar Gestão de tráfego" }));
    const dialog = within(screen.getByRole("dialog"));

    expect(dialog.getByLabelText(/descrição/i)).toHaveValue("Gestão de tráfego");
    expect(dialog.getByLabelText(/vencimento/i)).toHaveValue("10/11/2026");
    expect(dialog.getByLabelText(/observações/i)).toHaveValue("Combinado por telefone");
    expect(dialog.getByRole("note")).toHaveTextContent(/próximo vencimento do serviço/i);
    const form = dialog.getByRole("button", { name: "Salvar alterações" }).closest("form")!;
    expect(form.querySelector('input[name="id"]')).toHaveValue(chargeId);
    expect(form.querySelector('input[name="returnTo"]')).toHaveValue("/cobrancas");
    // Adicional de repasse continua repasse se o usuário não mexer nele.
    expect(form.querySelector('[name="additionalFeeNature"]')).toHaveValue("passthrough");
  });

  it("oferece a troca de empresa só com empresas ativas do cliente", () => {
    const entities = [
      {
        clientId,
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        name: "Loja Centro",
        typeLabel: "Filial",
      },
      {
        clientId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        id: "x",
        name: "Outra",
        typeLabel: "Marca",
      },
    ];
    const { unmount } = render(
      <EditChargeButton charge={charge} entities={entities} returnTo="/cobrancas" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar Gestão de tráfego" }));
    const form = screen.getByRole("button", { name: "Salvar alterações" }).closest("form")!;
    expect(form.querySelector('[name="clientEntityId"]')).not.toBeNull();
    unmount();

    // Vínculo com empresa arquivada (fora da lista): o campo some para não apagá-lo.
    render(
      <EditChargeButton
        charge={{ ...charge, clientEntityId: "99999999-9999-4999-8999-999999999999" }}
        entities={entities}
        returnTo="/cobrancas"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar Gestão de tráfego" }));
    const archived = screen.getByRole("button", { name: "Salvar alterações" }).closest("form")!;
    expect(archived.querySelector('[name="clientEntityId"]')).toBeNull();
  });

  it("não fala de agenda em cobrança avulsa", () => {
    render(
      <EditChargeButton charge={{ ...charge, clientServiceId: null }} returnTo="/cobrancas" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar Gestão de tráfego" }));

    expect(within(screen.getByRole("dialog")).queryByRole("note")).not.toBeInTheDocument();
  });
});
