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
    workspaceTimezone: "America/Sao_Paulo",
  })),
}));

import { createManualAlert, resolveManualAlert, snoozeManualAlert } from "@/app/alertas/actions";

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

  it("adia a partir de hoje, no fuso do workspace, e só lembrete aberto", async () => {
    vi.useFakeTimers();
    // 01h em UTC ainda é dia 9 em São Paulo: a data nova tem de sair do fuso do workspace.
    vi.setSystemTime(new Date("2026-10-10T01:00:00.000Z"));
    const form = new FormData();
    form.set("id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    form.set("days", "7");

    await expect(snoozeManualAlert(form)).rejects.toThrow("REDIRECT:/alertas?status=snoozed");
    vi.useRealTimers();

    expect(mocks.update).toHaveBeenCalledWith({ due_on: "2026-10-16" });
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith("id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith("state", "open");
  });

  it("recusa prazo de adiamento fora das opções oferecidas", async () => {
    for (const days of ["0", "365", "-1", "abc"]) {
      const form = new FormData();
      form.set("id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
      form.set("days", days);
      await expect(snoozeManualAlert(form)).rejects.toThrow("REDIRECT:/alertas?status=error");
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
