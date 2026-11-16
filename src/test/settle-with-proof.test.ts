import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  store: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/documents/store-fiscal-document", () => ({ storeFiscalDocument: mocks.store }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: vi.fn(), rpc: mocks.rpc },
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceTimezone: "America/Sao_Paulo",
  })),
}));

import { markChargePaid } from "@/app/_actions/mvp";

const chargeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const pdf = () =>
  new File([new TextEncoder().encode("%PDF-1.7\n%test\n")], "recibo.pdf", {
    type: "application/pdf",
  });

function form(proof?: File) {
  const data = new FormData();
  data.set("id", chargeId);
  data.set("paymentMethod", "Pix");
  data.set("returnTo", "/cobrancas");
  if (proof) data.set("proof", proof);
  return data;
}

describe("baixa da cobrança com comprovante", () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: { status: "settled" }, error: null });
    mocks.store.mockReset().mockResolvedValue("ok");
  });

  it("sem arquivo, baixa normalmente e não toca no storage", async () => {
    await expect(markChargePaid(form())).rejects.toThrow("REDIRECT:/cobrancas?status=paid");
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("campo de arquivo vazio é o mesmo que não anexar", async () => {
    const empty = new File([], "", { type: "application/octet-stream" });
    await expect(markChargePaid(form(empty))).rejects.toThrow("REDIRECT:/cobrancas?status=paid");
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("com comprovante válido, baixa e anexa como comprovante", async () => {
    await expect(markChargePaid(form(pdf()))).rejects.toThrow(
      "REDIRECT:/cobrancas?status=paid-proof",
    );
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.store).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: chargeId, entityType: "charge", kind: "payment_proof" }),
    );
  });

  it("arquivo inválido é recusado antes de dar baixa", async () => {
    const fake = new File([new TextEncoder().encode("não sou pdf")], "x.pdf", {
      type: "application/pdf",
    });
    await expect(markChargePaid(form(fake))).rejects.toThrow(
      "REDIRECT:/cobrancas?status=proof-invalid",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it("se o envio falhar depois da baixa, avisa sem desfazer o pagamento", async () => {
    mocks.store.mockResolvedValue("error");
    await expect(markChargePaid(form(pdf()))).rejects.toThrow(
      "REDIRECT:/cobrancas?status=paid-proof-error",
    );
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
