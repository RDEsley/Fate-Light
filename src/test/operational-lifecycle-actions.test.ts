import { vi } from "vitest";

const lifecycleMocks = vi.hoisted(() => {
  const chain = {
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  };
  return {
    chain,
    from: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    rpc: vi.fn(),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: lifecycleMocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: lifecycleMocks.redirect }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: lifecycleMocks.from, rpc: lifecycleMocks.rpc },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import {
  deleteClientService,
  deleteOperationalRecord,
  setClientServiceState,
  updateClientServiceSchedule,
} from "@/app/_actions/mvp";

const clientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const recordId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("operational lifecycle actions", () => {
  beforeEach(() => {
    Object.values(lifecycleMocks).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) value.mockReset();
    });
    Object.values(lifecycleMocks.chain).forEach((mock) => mock.mockReset());
    lifecycleMocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    lifecycleMocks.from.mockReturnValue(lifecycleMocks.chain);
    lifecycleMocks.chain.update.mockReturnValue(lifecycleMocks.chain);
    lifecycleMocks.chain.eq.mockReturnValue(lifecycleMocks.chain);
    lifecycleMocks.chain.select.mockReturnValue(lifecycleMocks.chain);
    lifecycleMocks.chain.single.mockResolvedValue({ data: { id: recordId }, error: null });
    lifecycleMocks.rpc.mockResolvedValue({ data: "deleted", error: null });
  });

  it("pausa um serviço sem marcar encerramento", async () => {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);
    formData.set("state", "paused");

    await expect(setClientServiceState(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=service-paused`,
    );
    expect(lifecycleMocks.chain.update).toHaveBeenCalledWith({
      ended_at: null,
      status: "paused",
    });
  });

  it("retoma um serviço pausado limpando a data de encerramento", async () => {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);
    formData.set("state", "active");

    await expect(setClientServiceState(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=service-resumed`,
    );
    expect(lifecycleMocks.chain.update).toHaveBeenCalledWith({
      ended_at: null,
      status: "active",
    });
  });

  it("encerra um serviço registrando a data", async () => {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);
    formData.set("state", "ended");

    await expect(setClientServiceState(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=service-ended`,
    );
    expect(lifecycleMocks.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ended" }),
    );
    const [payload] = lifecycleMocks.chain.update.mock.calls.at(-1) as [{ ended_at: string }];
    expect(payload.ended_at).toEqual(expect.any(String));
  });

  it("recusa um estado de serviço fora do contrato", async () => {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);
    formData.set("state", "cancelled");

    await expect(setClientServiceState(formData)).rejects.toThrow(
      "REDIRECT:/clientes?status=service-error",
    );
    expect(lifecycleMocks.chain.update).not.toHaveBeenCalled();
  });

  it("exclui serviço e cobranças não pagas pela RPC em cascata", async () => {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);

    await expect(deleteClientService(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=deleted`,
    );
    expect(lifecycleMocks.rpc).toHaveBeenCalledWith("delete_client_service_cascade", {
      p_force: false,
      p_service_id: recordId,
    });
  });

  it("só força a exclusão quando o formulário pede explicitamente", async () => {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);
    formData.set("force", "on");

    await expect(deleteClientService(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=deleted`,
    );
    expect(lifecycleMocks.rpc).toHaveBeenCalledWith("delete_client_service_cascade", {
      p_force: true,
      p_service_id: recordId,
    });
  });

  it("avisa quando a exclusão do serviço é bloqueada por cobrança paga", async () => {
    lifecycleMocks.rpc.mockResolvedValue({ data: "blocked", error: null });
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("id", recordId);

    await expect(deleteClientService(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=service-delete-blocked`,
    );
  });

  it("atualiza somente a agenda futura do serviço", async () => {
    const formData = new FormData();
    formData.set("billingType", "annual");
    formData.set("clientId", clientId);
    formData.set("id", recordId);
    formData.set("nextDueDate", "2027-08-03");

    await expect(updateClientServiceSchedule(formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=service-schedule-updated`,
    );
    expect(lifecycleMocks.chain.update).toHaveBeenCalledWith({
      billing_type: "annual",
      next_due_date: "2027-08-03",
    });
  });

  it("usa a RPC protegida para excluir somente registros elegíveis", async () => {
    const formData = new FormData();
    formData.set("clientId", "");
    formData.set("id", recordId);
    formData.set("recordType", "charge");

    await expect(deleteOperationalRecord(formData)).rejects.toThrow(
      "REDIRECT:/cobrancas?status=deleted",
    );
    expect(lifecycleMocks.rpc).toHaveBeenCalledWith("delete_workspace_record", {
      p_record_id: recordId,
      p_record_type: "charge",
    });
  });
});
