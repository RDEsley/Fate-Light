import { vi } from "vitest";

vi.mock("server-only", () => ({}));

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const clientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const entityId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const otherClientId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const mocks = vi.hoisted(() => ({
  entityLookup: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: { from: mocks.from, rpc: mocks.rpc },
    workspaceId,
  })),
}));

import { consolidateClient } from "@/app/clientes/[clientId]/entity-actions";
import { createCharge } from "@/app/_actions/mvp";
import {
  clientEntityTypeLabel,
  consolidationPhrase,
  parseClientEntityForm,
  readConsolidationPayload,
} from "@/features/clients/entity-schemas";
import { initialActionState } from "@/lib/forms/action-state";

/** Encadeamento mínimo do PostgREST: tudo devolve `this` até o terminador. */
function lookupChain(result: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ["eq", "is", "select"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

function insertChain() {
  return {
    insert: mocks.insert.mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: "charge-id" }, error: null }) }),
    }),
  };
}

function chargeForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("clientId", clientId);
  formData.set("description", "Mensalidade");
  formData.set("dueDate", "2026-10-01");
  formData.set("companyRevenue", "1000,00");
  formData.set("mediaBudget", "0,00");
  formData.set("additionalFee", "0,00");
  formData.set("notes", "");
  formData.set("paymentMethod", "");
  formData.set("clientServiceId", "");
  for (const [field, value] of Object.entries(overrides)) formData.set(field, value);
  return formData;
}

describe("empresas e marcas do cliente", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
  });

  it("aceita cadastro só com nome e devolve os campos opcionais como nulo", () => {
    const formData = new FormData();
    formData.set("displayName", "  Padaria do Bairro ");
    formData.set("entityType", "brand");
    formData.set("website", "https://Padaria.com.br/contato");

    const parsed = parseClientEntityForm(formData);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.display_name).toBe("Padaria do Bairro");
    expect(parsed.data.entity_type).toBe("brand");
    expect(parsed.data.website).toBe("padaria.com.br");
    expect(parsed.data.tax_id).toBeNull();
    expect(parsed.data.legal_name).toBeNull();
  });

  it("recusa nome curto e tipo desconhecido", () => {
    const formData = new FormData();
    formData.set("displayName", "P");
    formData.set("entityType", "holding");

    const parsed = parseClientEntityForm(formData);

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fields = parsed.error.issues.map((issue) => issue.path[0]);
    expect(fields).toContain("displayName");
    expect(fields).toContain("entityType");
  });

  it("traduz os tipos para português e cai em Empresa quando o valor é desconhecido", () => {
    expect(clientEntityTypeLabel("company")).toBe("Empresa");
    expect(clientEntityTypeLabel("brand")).toBe("Marca");
    expect(clientEntityTypeLabel("project")).toBe("Projeto");
    expect(clientEntityTypeLabel("other")).toBe("Outro");
    expect(clientEntityTypeLabel(null)).toBe("Empresa");
  });

  it("recusa cobrança com empresa/marca de outro cliente sem tocar no banco", async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === "client_entities") return lookupChain({ data: null });
      return insertChain();
    });

    const state = await createCharge(
      initialActionState,
      chargeForm({ clientEntityId: entityId }),
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.clientEntityId).toMatch(/não pertence a este cliente/);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("grava a empresa/marca válida e nunca vincula serviço na cobrança manual", async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === "client_entities") return lookupChain({ data: { id: entityId } });
      return insertChain();
    });

    await expect(
      createCharge(initialActionState, chargeForm({ clientEntityId: entityId })),
    ).rejects.toThrow(/REDIRECT:/);

    const [payload] = mocks.insert.mock.calls[0];
    expect(payload.client_entity_id).toBe(entityId);
    expect(payload.client_service_id).toBeNull();
  });

  it("mantém a cobrança geral quando nenhuma empresa/marca é escolhida", async () => {
    mocks.from.mockImplementation(() => insertChain());

    await expect(createCharge(initialActionState, chargeForm())).rejects.toThrow(/REDIRECT:/);

    const [payload] = mocks.insert.mock.calls[0];
    expect(payload.client_entity_id).toBeNull();
    expect(payload.client_service_id).toBeNull();
  });

  it("chama a RPC de consolidação com a frase CONSOLIDAR", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        counts: { charges: 3, contacts: 1, domains: 0, expenses: 2, services: 1 },
        ok: true,
        source: { id: otherClientId, name: "Cliente Antigo", status: "inactive" },
        target: { id: clientId, name: "Cliente Novo", status: "active" },
        totals: { expenses_paid: 50, media: 0, own_received: 100 },
      },
      error: null,
    });
    const formData = new FormData();
    formData.set("confirmation", consolidationPhrase);
    formData.set("displayName", "Padaria do Bairro");
    formData.set("entityType", "company");
    formData.set("sourceClientId", otherClientId);
    formData.set("targetClientId", clientId);

    await expect(consolidateClient({ status: "idle" }, formData)).rejects.toThrow(
      `REDIRECT:/clientes/${clientId}?status=client-consolidated`,
    );
    expect(mocks.rpc).toHaveBeenCalledWith("consolidate_client_into_entity", {
      p_confirmation: "CONSOLIDAR",
      p_entity_display_name: "Padaria do Bairro",
      p_entity_type: "company",
      p_source_client_id: otherClientId,
      p_target_client_id: clientId,
    });
  });

  it("bloqueia a consolidação sem a frase exata e não chama a RPC", async () => {
    const formData = new FormData();
    formData.set("confirmation", "consolidar");
    formData.set("displayName", "Padaria do Bairro");
    formData.set("entityType", "company");
    formData.set("sourceClientId", otherClientId);
    formData.set("targetClientId", clientId);

    const state = await consolidateClient({ status: "idle" }, formData);

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/CONSOLIDAR/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("traduz a recusa da RPC em vez de mostrar o código cru", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: false, reason: "source_has_entities" }, error: null });
    const formData = new FormData();
    formData.set("confirmation", consolidationPhrase);
    formData.set("displayName", "Padaria do Bairro");
    formData.set("entityType", "company");
    formData.set("sourceClientId", otherClientId);
    formData.set("targetClientId", clientId);

    const state = await consolidateClient({ status: "idle" }, formData);

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/já possui empresas\/marcas/);
  });

  it("normaliza números da prévia mesmo quando a RPC devolve texto", () => {
    const payload = readConsolidationPayload({
      counts: { charges: "3", contacts: null, domains: 0, expenses: "2", services: 1 },
      ok: true,
      source: { id: otherClientId, name: "Cliente Antigo", status: "active" },
      target: { id: clientId, name: "Cliente Novo", status: "active" },
      totals: { expenses_paid: "50.5", media: null, own_received: "100" },
    });

    expect(payload?.ok).toBe(true);
    if (!payload?.ok) return;
    expect(payload.counts.charges).toBe(3);
    expect(payload.counts.contacts).toBe(0);
    expect(payload.totals.expenses_paid).toBe(50.5);
    expect(payload.totals.media).toBe(0);
  });
});
