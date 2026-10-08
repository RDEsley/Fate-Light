import { vi } from "vitest";

const onboardingMocks = vi.hoisted(() => ({
  claims: vi.fn(),
  legalDocuments: [
    { id: "10000000-0000-4000-8000-000000000001" },
    { id: "10000000-0000-4000-8000-000000000002" },
  ],
  legalQuery: undefined as unknown as {
    eq: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  },
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  rpc: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: onboardingMocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getClaims: onboardingMocks.claims },
    from: vi.fn(() => onboardingMocks.legalQuery),
    rpc: onboardingMocks.rpc,
  })),
}));

import { bootstrapAccount } from "@/app/onboarding/actions";
import { initialActionState } from "@/lib/forms/action-state";

function onboardingForm(overrides: Record<string, string | string[]> = {}) {
  const values: Record<string, string | string[]> = {
    accountingBasis: "cash",
    alertOffsets: ["30", "15", "7", "1"],
    currency: "BRL",
    dateFormat: "DD/MM/YYYY",
    fullName: "Pessoa Responsável",
    legalDocumentIds: [
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
    ],
    legalName: "Empresa Exemplo LTDA",
    phone: "",
    taxId: "12.345.678/0001-95",
    theme: "light",
    timezone: "America/Sao_Paulo",
    tradeName: "Empresa Exemplo",
    workspaceName: "Empresa Exemplo",
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((item) => formData.append(key, item));
  });
  return formData;
}

describe("onboarding action", () => {
  beforeEach(() => {
    onboardingMocks.redirect.mockClear();
    onboardingMocks.rpc.mockReset();
    onboardingMocks.rpc.mockResolvedValue({ data: [{}], error: null });
    onboardingMocks.claims.mockReset();
    onboardingMocks.claims.mockResolvedValue({
      data: { claims: { sub: "user-id" } },
      error: null,
    });

    const query = {
      eq: vi.fn(),
      lte: vi.fn(async () => ({ data: onboardingMocks.legalDocuments, error: null })),
      select: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    onboardingMocks.legalQuery = query;
  });

  it("confere as versões legais no servidor e chama o bootstrap aprovado", async () => {
    await expect(bootstrapAccount(initialActionState, onboardingForm())).rejects.toThrow(
      "REDIRECT:/dashboard",
    );

    expect(onboardingMocks.rpc).toHaveBeenCalledWith(
      "bootstrap_identity_workspace",
      expect.objectContaining({
        p_accepted_legal_document_ids: onboardingMocks.legalDocuments.map(({ id }) => id),
        p_default_alert_offsets: [1, 7, 15, 30],
        p_tax_id: "12345678000195",
        p_workspace_name: "Empresa Exemplo",
      }),
    );
  });

  it("rejeita aceite desatualizado antes da RPC", async () => {
    const result = await bootstrapAccount(
      initialActionState,
      onboardingForm({
        legalDocumentIds: ["10000000-0000-4000-8000-000000000001"],
      }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: expect.stringMatching(/atualizados/i),
    });
    expect(onboardingMocks.rpc).not.toHaveBeenCalled();
  });

  it("rejeita documento fiscal inválido sem persistir dados", async () => {
    const result = await bootstrapAccount(initialActionState, onboardingForm({ taxId: "123" }));

    expect(result).toMatchObject({
      fieldErrors: { taxId: expect.stringMatching(/11 ou 14/i) },
      message: expect.stringMatching(/11 ou 14/i),
      status: "error",
    });
    expect(onboardingMocks.rpc).not.toHaveBeenCalled();
  });

  it("conclui só com nome, empresa e aceites, aplicando os padrões no servidor", async () => {
    const formData = new FormData();
    formData.set("fullName", "Pessoa Responsável");
    formData.set("workspaceName", "Estúdio Exemplo");
    onboardingMocks.legalDocuments.forEach(({ id }) => formData.append("legalDocumentIds", id));
    // Valores fixos não vêm mais do formulário: mesmo enviados, são ignorados.
    formData.set("currency", "USD");
    formData.set("theme", "dark");
    formData.set("dateFormat", "YYYY-MM-DD");

    await expect(bootstrapAccount(initialActionState, formData)).rejects.toThrow(
      "REDIRECT:/dashboard",
    );

    expect(onboardingMocks.rpc).toHaveBeenCalledWith("bootstrap_identity_workspace", {
      p_accepted_legal_document_ids: onboardingMocks.legalDocuments.map(({ id }) => id),
      p_accounting_basis: "cash",
      p_currency: "BRL",
      p_date_format: "DD/MM/YYYY",
      p_default_alert_offsets: [1, 7, 15, 30],
      p_full_name: "Pessoa Responsável",
      p_legal_name: "Estúdio Exemplo",
      p_locale: "pt-BR",
      p_phone: undefined,
      p_tax_id: undefined,
      p_theme: "light",
      p_timezone: "America/Sao_Paulo",
      p_trade_name: undefined,
      p_workspace_name: "Estúdio Exemplo",
    });
  });

  it("aponta o campo exato e devolve o que foi digitado quando algo falta", async () => {
    const result = await bootstrapAccount(
      initialActionState,
      onboardingForm({ fullName: "A", legalDocumentIds: [], phone: "123", workspaceName: "" }),
    );

    expect(result.status).toBe("error");
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "acceptedLegalDocumentIds",
      "fullName",
      "phone",
      "workspaceName",
    ]);
    expect(result.values?.phone).toEqual(["123"]);
    expect(onboardingMocks.claims).not.toHaveBeenCalled();
    expect(onboardingMocks.rpc).not.toHaveBeenCalled();
  });

  it("não cria nada sem sessão e preserva o formulário se a RPC falhar", async () => {
    onboardingMocks.claims.mockResolvedValue({ data: { claims: {} }, error: null });
    await expect(bootstrapAccount(initialActionState, onboardingForm())).resolves.toMatchObject({
      message: expect.stringMatching(/sessão expirou/i),
      status: "error",
    });
    expect(onboardingMocks.rpc).not.toHaveBeenCalled();

    onboardingMocks.claims.mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null });
    onboardingMocks.rpc.mockResolvedValue({ data: null, error: { message: "falhou" } });
    const result = await bootstrapAccount(initialActionState, onboardingForm());
    expect(result).toMatchObject({ status: "error" });
    expect(result.values?.workspaceName).toEqual(["Empresa Exemplo"]);
  });
});
