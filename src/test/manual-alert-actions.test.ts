import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  const updateQuery = {
    eq: vi.fn(),
    then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
  };
  updateQuery.eq.mockImplementation(() => updateQuery);
  return {
    from: vi.fn(),
    insert: vi.fn(),
    redirect: vi.fn((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    }),
    revalidatePath: vi.fn(),
    update: vi.fn(() => updateQuery),
    updateQuery,
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: mocks.from },
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import { createManualAlert, resolveManualAlert } from "@/app/alertas/actions";

describe("manual alert actions", () => {
  beforeEach(() => {
    mocks.insert.mockReset().mockResolvedValue({ error: null });
    mocks.update.mockClear();
    mocks.updateQuery.eq.mockClear();
    mocks.updateQuery.eq.mockImplementation(() => mocks.updateQuery);
    mocks.from.mockReset().mockReturnValue({ insert: mocks.insert, update: mocks.update });
  });

  it("cria um lembrete somente no workspace da sessão", async () => {
    const form = new FormData();
    form.set("title", "Revisar orçamento");
    form.set("dueOn", "2026-09-01");
    form.set("severity", "warning");
    form.set("notes", "Retornar ao cliente");

    await expect(createManualAlert(form)).rejects.toThrow("REDIRECT:/alertas?status=created");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Revisar orçamento",
        workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );
  });

  it("resolve filtrando identificador, workspace e estado aberto", async () => {
    const form = new FormData();
    form.set("id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    await expect(resolveManualAlert(form)).rejects.toThrow("REDIRECT:/alertas?status=resolved");
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith("state", "open");
  });
});
