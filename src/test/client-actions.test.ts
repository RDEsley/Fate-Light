import { vi } from "vitest";

const clientActionMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  is: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: clientActionMocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: clientActionMocks.redirect,
}));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: clientActionMocks.from, rpc: clientActionMocks.rpc },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import { archiveClient, createClient, deleteClient, setClientStatus } from "@/app/clientes/actions";

function validClientForm() {
  const formData = new FormData();
  const values = {
    companyName: "Empresa Segura",
    email: "cliente@example.test",
    name: "Cliente Seguro",
    notes: "",
    phone: "81999999999",
    status: "active",
  };
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  formData.set("workspaceId", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  return formData;
}

describe("client actions", () => {
  beforeEach(() => {
    Object.values(clientActionMocks).forEach((mock) => mock.mockReset());
    clientActionMocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    clientActionMocks.from.mockReturnValue({
      insert: clientActionMocks.insert,
      update: clientActionMocks.update,
    });
    clientActionMocks.insert.mockReturnValue({ select: clientActionMocks.select });
    clientActionMocks.update.mockReturnValue({ eq: clientActionMocks.eq });
    clientActionMocks.eq
      .mockReturnValueOnce({ eq: clientActionMocks.eq })
      .mockReturnValueOnce({ is: clientActionMocks.is });
    clientActionMocks.is.mockReturnValue({ select: clientActionMocks.select });
    clientActionMocks.select.mockReturnValue({ single: clientActionMocks.single });
    clientActionMocks.single.mockResolvedValue({ data: { id: "client-id" }, error: null });
    clientActionMocks.rpc.mockResolvedValue({ data: "deleted", error: null });
  });

  it("deriva o workspace do contexto e ignora workspace forjado no formulário", async () => {
    await expect(createClient(validClientForm())).rejects.toThrow(
      "REDIRECT:/clientes/client-id?status=created",
    );

    expect(clientActionMocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cliente Seguro",
        workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );
    expect(clientActionMocks.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    );
  });

  it("inativa por update limitado ao workspace em vez de excluir", async () => {
    const formData = new FormData();
    formData.set("clientId", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    formData.set("clientStatus", "inactive");

    await expect(setClientStatus(formData)).rejects.toThrow(
      "REDIRECT:/clientes/cccccccc-cccc-4ccc-8ccc-cccccccccccc?status=status-updated",
    );

    expect(clientActionMocks.update).toHaveBeenCalledWith({ commercial_status: "inactive" });
    expect(clientActionMocks.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("arquiva preservando o histórico em vez de excluir", async () => {
    const formData = new FormData();
    formData.set("clientId", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");

    await expect(archiveClient(formData)).rejects.toThrow(
      "REDIRECT:/clientes?state=archived&status=archived",
    );

    const [payload] = clientActionMocks.update.mock.calls.at(-1) as [
      { archived_at: string; commercial_status: string },
    ];
    expect(payload.commercial_status).toBe("archived");
    expect(payload.archived_at).toEqual(expect.any(String));
  });

  it("recusa situação comercial fora do contrato", async () => {
    const formData = new FormData();
    formData.set("clientId", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    formData.set("clientStatus", "forjado");

    await expect(setClientStatus(formData)).rejects.toThrow("REDIRECT:/clientes?status=error");
    expect(clientActionMocks.update).not.toHaveBeenCalled();
  });

  it("exclui pelo contrato transacional do banco", async () => {
    const formData = new FormData();
    formData.set("clientId", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");

    await expect(deleteClient(formData)).rejects.toThrow("REDIRECT:/clientes?status=deleted");
    expect(clientActionMocks.rpc).toHaveBeenCalledWith("delete_client_record", {
      p_client_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
  });
});
