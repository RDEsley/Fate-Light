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
  return {
    from: vi.fn(),
    query,
    redirect: vi.fn((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    }),
    revalidatePath: vi.fn(),
    update: vi.fn(() => query),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: mocks.from },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import { updateCharge } from "@/app/_actions/mvp";
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
    mocks.from.mockReset().mockReturnValue({ update: mocks.update });
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

describe("EditChargeButton", () => {
  const charge: EditableCharge = {
    additionalFee: "30.00",
    additionalFeeIsRevenue: false,
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

  it("não fala de agenda em cobrança avulsa", () => {
    render(
      <EditChargeButton charge={{ ...charge, clientServiceId: null }} returnTo="/cobrancas" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar Gestão de tráfego" }));

    expect(within(screen.getByRole("dialog")).queryByRole("note")).not.toBeInTheDocument();
  });
});
