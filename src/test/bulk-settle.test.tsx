import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = { eq: vi.fn(), in: vi.fn(), order: vi.fn(), select: vi.fn() };
  query.eq.mockImplementation(() => query);
  query.in.mockImplementation(() => query);
  query.select.mockImplementation(() => query);
  return {
    from: vi.fn(() => query),
    query,
    redirect: vi.fn((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    }),
    revalidatePath: vi.fn(),
    rpc: vi.fn(),
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

import { settleChargesInBulk } from "@/app/_actions/mvp";
import { BulkSettleButton } from "@/app/clientes/[clientId]/bulk-settle-button";

const clientId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

function bulkForm(ids = [first, second]) {
  const form = new FormData();
  form.set("clientId", clientId);
  for (const id of ids) form.append("chargeId", id);
  form.set("paymentMethod", "Pix");
  form.set("paidOn", "");
  return form;
}

describe("settleChargesInBulk", () => {
  beforeEach(() => {
    mocks.from.mockClear();
    mocks.query.eq.mockClear();
    mocks.query.in.mockClear();
    mocks.query.order
      .mockReset()
      .mockResolvedValue({ data: [{ id: first }, { id: second }], error: null });
    mocks.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it("recebe só as pendentes enviadas, deste cliente, na ordem do vencimento", async () => {
    await expect(settleChargesInBulk(bulkForm())).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=bulk-paid`,
    );
    expect(mocks.query.in).toHaveBeenCalledWith("id", [first, second]);
    expect(mocks.query.eq).toHaveBeenCalledWith("client_id", clientId);
    expect(mocks.query.eq).toHaveBeenCalledWith("status", "pending");
    expect(mocks.query.order).toHaveBeenCalledWith("due_date");
    expect(mocks.rpc.mock.calls.map(([, args]) => args.p_charge_id)).toEqual([first, second]);
  });

  it("para na primeira falha e avisa que a baixa foi parcial", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } });

    await expect(settleChargesInBulk(bulkForm())).rejects.toThrow("status=bulk-partial");
  });

  it("recusa a baixa sem nenhuma cobrança escolhida", async () => {
    await expect(settleChargesInBulk(bulkForm([]))).rejects.toThrow("status=invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("BulkSettleButton", () => {
  it("lista exatamente o que será recebido e envia só esses ids", () => {
    render(
      <BulkSettleButton
        charges={[
          { amount: 300, description: "Mensalidade de setembro", dueDate: "2026-09-10", id: first },
          { amount: 300, description: "Mensalidade de outubro", dueDate: "2026-10-10", id: second },
        ]}
        clientId={clientId}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Receber vencidas (2)" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("list", { name: /serão recebidas/i })).toHaveTextContent(
      "Mensalidade de setembro",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("R$ 600,00");
    const form = dialog.getByRole("button", { name: "Receber 2 cobranças" }).closest("form")!;
    const ids = [...form.querySelectorAll('input[name="chargeId"]')].map(
      (input) => (input as HTMLInputElement).value,
    );
    expect(ids).toEqual([first, second]);
  });
});
