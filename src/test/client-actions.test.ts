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

import { archiveClient, createClient } from "@/app/clientes/actions";

function validClientForm() {
  const formData = new FormData();
  const values = {
    addressCity: "",
    addressCountryCode: "BR",
    addressDistrict: "",
    addressLine1: "",
    addressLine2: "",
    addressPostalCode: "",
    addressRegion: "",
    commercialStatus: "lead",
    kind: "company",
    name: "Cliente Seguro",
    notes: "",
    responsibleName: "",
    tags: "",
    taxId: "",
    tradeName: "",
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

  it("arquiva por update limitado ao workspace em vez de excluir", async () => {
    const formData = new FormData();
    formData.set("clientId", "cccccccc-cccc-4ccc-8ccc-cccccccccccc");

    await expect(archiveClient(formData)).rejects.toThrow("REDIRECT:/clientes?status=archived");

    expect(clientActionMocks.update).toHaveBeenCalledWith({
      archived_at: expect.any(String),
      commercial_status: "archived",
    });
    expect(clientActionMocks.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });
});
