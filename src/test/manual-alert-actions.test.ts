import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  const updateQuery = {
    eq: vi.fn(),
    // Resolver pede de volta o lembrete fechado; adiar só espera o resultado.
    maybeSingle: vi.fn(),
    select: vi.fn(),
    then: (resolve: (value: { error: null }) => unknown) => resolve({ error: null }),
  };
  updateQuery.eq.mockImplementation(() => updateQuery);
  updateQuery.select.mockImplementation(() => updateQuery);
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

const clientId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** Lembrete devolvido pelo banco ao ser fechado. */
function resolved(overrides: Record<string, unknown> = {}) {
  return {
    client_id: null,
    due_on: "2026-10-05",
    notes: "Retornar ao cliente",
    recurrence: "none",
    severity: "warning",
    title: "Revisar orçamento",
    ...overrides,
  };
}

describe("manual alert actions", () => {
  beforeEach(() => {
    mocks.insert.mockReset().mockResolvedValue({ error: null });
    mocks.update.mockClear();
    mocks.updateQuery.eq.mockClear();
    mocks.updateQuery.eq.mockImplementation(() => mocks.updateQuery);
    mocks.updateQuery.select.mockClear();
    mocks.updateQuery.maybeSingle.mockReset().mockResolvedValue({ data: resolved(), error: null });
    mocks.from.mockReset().mockReturnValue({ insert: mocks.insert, update: mocks.update });
  });

  const resolveForm = () => {
    const form = new FormData();
    form.set("id", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    return form;
  };

  it("cria um lembrete somente no workspace da sessão", async () => {
    const form = new FormData();
    form.set("title", "Revisar orçamento");
    form.set("dueOn", "2026-09-01");
    form.set("severity", "warning");
    form.set("notes", "Retornar ao cliente");

    await expect(createManualAlert(form)).rejects.toThrow("REDIRECT:/alertas?status=created");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: null,
        recurrence: "none",
        title: "Revisar orçamento",
        workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );
  });

  it("grava cliente e repetição quando informados e recusa opções fora do contrato", async () => {
    const form = new FormData();
    form.set("title", "Enviar relatório");
    form.set("dueOn", "2026-09-01");
    form.set("severity", "danger");
    form.set("clientId", clientId);
    form.set("recurrence", "monthly");

    await expect(createManualAlert(form)).rejects.toThrow("REDIRECT:/alertas?status=created");
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: clientId, recurrence: "monthly", severity: "danger" }),
    );

    mocks.insert.mockClear();
    for (const [field, value] of [
      ["recurrence", "daily"],
      ["clientId", "não-é-uuid"],
    ] as const) {
      const invalid = new FormData();
      invalid.set("title", "Enviar relatório");
      invalid.set("dueOn", "2026-09-01");
      invalid.set("severity", "warning");
      invalid.set(field, value);
      await expect(createManualAlert(invalid)).rejects.toThrow("REDIRECT:/alertas?status=invalid");
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("resolve filtrando identificador, workspace e estado aberto", async () => {
    await expect(resolveManualAlert(resolveForm())).rejects.toThrow(
      "REDIRECT:/alertas?status=resolved",
    );
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith(
      "workspace_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(mocks.updateQuery.eq).toHaveBeenCalledWith("state", "open");
    // Lembrete sem repetição só fecha: nada novo é criado.
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("agenda a próxima ocorrência ao resolver um lembrete que se repete", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T15:00:00.000Z"));
    mocks.updateQuery.maybeSingle.mockResolvedValue({
      data: resolved({ client_id: clientId, due_on: "2026-10-05", recurrence: "monthly" }),
      error: null,
    });

    await expect(resolveManualAlert(resolveForm())).rejects.toThrow(
      "REDIRECT:/alertas?status=repeated",
    );
    vi.useRealTimers();

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith({
      client_id: clientId,
      due_on: "2026-11-05",
      notes: "Retornar ao cliente",
      recurrence: "monthly",
      severity: "warning",
      title: "Revisar orçamento",
      workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });

  it("não duplica a série quando o lembrete já tinha sido resolvido", async () => {
    // Segundo envio: nenhuma linha aberta casa com o filtro, o banco não devolve nada.
    mocks.updateQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(resolveManualAlert(resolveForm())).rejects.toThrow(
      "REDIRECT:/alertas?status=resolved",
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("avisa quando resolve mas não consegue agendar a próxima ocorrência", async () => {
    mocks.updateQuery.maybeSingle.mockResolvedValue({
      data: resolved({ recurrence: "weekly" }),
      error: null,
    });
    mocks.insert.mockResolvedValue({ error: { message: "falhou" } });

    await expect(resolveManualAlert(resolveForm())).rejects.toThrow(
      "REDIRECT:/alertas?status=repeat-error",
    );
  });

  it("não cria nada quando o fechamento falha ou o identificador é inválido", async () => {
    mocks.updateQuery.maybeSingle.mockResolvedValue({ data: null, error: { message: "falhou" } });
    await expect(resolveManualAlert(resolveForm())).rejects.toThrow(
      "REDIRECT:/alertas?status=error",
    );

    const invalid = new FormData();
    invalid.set("id", "não-é-uuid");
    await expect(resolveManualAlert(invalid)).rejects.toThrow("REDIRECT:/alertas?status=error");
    expect(mocks.insert).not.toHaveBeenCalled();
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
