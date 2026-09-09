import { vi } from "vitest";

vi.mock("server-only", () => ({}));

const actionMocks = vi.hoisted(() => {
  const chain = {
    eq: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  };
  return {
    chain,
    from: vi.fn(),
    redirect: vi.fn(),
    remove: vi.fn(),
    revalidatePath: vi.fn(),
    rpc: vi.fn(),
    storageFrom: vi.fn(),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: actionMocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: actionMocks.redirect }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: {
      from: actionMocks.from,
      rpc: actionMocks.rpc,
      storage: { from: actionMocks.storageFrom },
    },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import {
  deletePaidFinancialRecord,
  markChargePaid,
  markExpensePaid,
  stopExpenseRecurrence,
} from "@/app/_actions/mvp";

const chargeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const clientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("financial hardening actions", () => {
  beforeEach(() => {
    Object.values(actionMocks).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) value.mockReset();
    });
    Object.values(actionMocks.chain).forEach((mock) => mock.mockReset());
    actionMocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    actionMocks.from.mockReturnValue(actionMocks.chain);
    actionMocks.storageFrom.mockReturnValue({ remove: actionMocks.remove });
    actionMocks.remove.mockResolvedValue({ error: null });
  });

  it("marca cobrança paga e revalida retorno seguro do cliente", async () => {
    actionMocks.rpc.mockResolvedValue({ data: "settled", error: null });
    const formData = new FormData();
    formData.set("id", chargeId);
    formData.set("paymentMethod", "Pix");
    formData.set("returnTo", `/clientes/${clientId}`);

    await expect(markChargePaid(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=paid`,
    );
    expect(actionMocks.rpc).toHaveBeenCalledWith("settle_charge_and_schedule_next", {
      p_charge_id: chargeId,
      p_payment_method: "Pix",
    });
    const paths = actionMocks.revalidatePath.mock.calls.map(([path, type]) =>
      type ? `${path}:${type}` : path,
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/historico",
        "/cobrancas",
        "/clientes",
        "/clientes/[clientId]:page",
        `/clientes/${clientId}`,
      ]),
    );
  });

  it("revalida ficha dinâmica mesmo pagando em /cobrancas sem clientId", async () => {
    actionMocks.rpc.mockResolvedValue({ data: "settled", error: null });
    const formData = new FormData();
    formData.set("id", chargeId);
    formData.set("paymentMethod", "Pix");

    await expect(markChargePaid(formData)).rejects.toThrow("REDIRECT:/cobrancas?status=paid");
    const paths = actionMocks.revalidatePath.mock.calls.map(([path, type]) =>
      type ? `${path}:${type}` : path,
    );
    expect(paths).toEqual(
      expect.arrayContaining(["/clientes/[clientId]:page", "/cobrancas", "/dashboard"]),
    );
  });

  it("ignora returnTo inseguro em markChargePaid", async () => {
    actionMocks.rpc.mockResolvedValue({ data: "settled", error: null });
    const formData = new FormData();
    formData.set("id", chargeId);
    formData.set("paymentMethod", "Pix");
    formData.set("returnTo", "https://evil.example");

    await expect(markChargePaid(formData)).rejects.toThrow("REDIRECT:/cobrancas?status=paid");
  });

  it("exclui cobrança paga, limpa storage e revalida superfícies", async () => {
    actionMocks.rpc.mockResolvedValue({
      data: { object_paths: ["ws/fiscal/charge/1.pdf"], status: "deleted" },
      error: null,
    });
    const formData = new FormData();
    formData.set("id", chargeId);
    formData.set("recordType", "charge");
    formData.set("returnTo", "/cobrancas");

    await expect(deletePaidFinancialRecord(formData)).rejects.toThrow(
      "REDIRECT:/cobrancas?status=paid-deleted",
    );
    expect(actionMocks.rpc).toHaveBeenCalledWith("delete_paid_financial_record", {
      p_record_id: chargeId,
      p_record_type: "charge",
    });
    expect(actionMocks.remove).toHaveBeenCalledWith(["ws/fiscal/charge/1.pdf"]);
  });

  it("avisa limpeza pendente quando o Storage falha após exclusão financeira", async () => {
    actionMocks.rpc.mockResolvedValue({
      data: { object_paths: ["ws/fiscal/charge/2.pdf"], status: "deleted" },
      error: null,
    });
    actionMocks.remove.mockResolvedValue({ error: { message: "storage down" } });
    const formData = new FormData();
    formData.set("id", chargeId);
    formData.set("recordType", "charge");
    formData.set("returnTo", "/cobrancas");

    await expect(deletePaidFinancialRecord(formData)).rejects.toThrow(
      "REDIRECT:/cobrancas?status=paid-deleted-storage-pending",
    );
  });

  it("liquida despesa pela RPC de recorrência", async () => {
    actionMocks.rpc.mockResolvedValue({
      data: { scheduled: true, status: "settled" },
      error: null,
    });
    const formData = new FormData();
    formData.set("id", chargeId);

    await expect(markExpensePaid(formData)).rejects.toThrow(
      "REDIRECT:/despesas?status=expense-next-scheduled",
    );
    expect(actionMocks.rpc).toHaveBeenCalledWith("settle_expense_and_schedule_next", {
      p_expense_id: chargeId,
    });
  });

  it("encerra recorrência mensal de despesa", async () => {
    actionMocks.rpc.mockResolvedValue({
      data: { status: "stopped", updated: 2 },
      error: null,
    });
    const formData = new FormData();
    formData.set("id", chargeId);

    await expect(stopExpenseRecurrence(formData)).rejects.toThrow(
      "REDIRECT:/despesas?status=expense-recurrence-stopped",
    );
  });
});
