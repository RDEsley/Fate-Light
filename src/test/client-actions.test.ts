import { vi } from "vitest";

const clientActionMocks = vi.hoisted(() => ({
  eq: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  is: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
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
    supabase: { from: clientActionMocks.from },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import { createClient, setClientStatus } from "@/app/clientes/actions";

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
      "REDIRECT:/clientes?status=inactivated",
    );

    expect(clientActionMocks.update).toHaveBeenCalledWith({ commercial_status: "inactive" });
    expect(clientActionMocks.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });
});
