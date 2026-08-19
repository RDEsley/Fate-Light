import { vi } from "vitest";

const workspaceMocks = vi.hoisted(() => ({
  claims: vi.fn(),
  remove: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: workspaceMocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getClaims: workspaceMocks.claims },
    rpc: workspaceMocks.rpc,
  })),
}));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: {
      rpc: workspaceMocks.rpc,
      storage: { from: workspaceMocks.storageFrom },
    },
    workspaceId: "workspace-id",
  })),
}));

import {
  resetWorkspaceOperationalData,
  updateWorkspaceConfiguration,
} from "@/app/configuracoes/empresa/actions";
import { initialActionState } from "@/lib/forms/action-state";

function workspaceForm(overrides: Record<string, string | string[]> = {}) {
  const values: Record<string, string | string[]> = {
    accountingBasis: "accrual",
    addressCity: "Recife",
    addressDistrict: "Centro",
    addressLine1: "Rua Exemplo, 100",
    addressLine2: "Sala 8",
    addressRegion: "PE",
    alertOffsets: ["30", "7", "1"],
    countryCode: "BR",
    dateFormat: "DD/MM/YYYY",
    legalName: "Empresa Atualizada LTDA",
    postalCode: "50000-000",
    taxId: "12.345.678/0001-95",
    timezone: "America/Recife",
    tradeName: "Empresa Atualizada",
    workspaceName: "Workspace Atualizado",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    (Array.isArray(value) ? value : [value]).forEach((item) => formData.append(key, item));
  });
  return formData;
}

describe("workspace configuration action", () => {
  beforeEach(() => {
    workspaceMocks.claims.mockReset();
    workspaceMocks.claims.mockResolvedValue({
      data: { claims: { sub: "verified-owner" } },
      error: null,
    });
    workspaceMocks.rpc.mockReset();
    workspaceMocks.rpc.mockResolvedValue({ data: [], error: null });
    workspaceMocks.storageFrom.mockReset();
    workspaceMocks.storageFrom.mockReturnValue({ remove: workspaceMocks.remove });
    workspaceMocks.remove.mockReset();
    workspaceMocks.remove.mockResolvedValue({ error: null });
    workspaceMocks.revalidatePath.mockClear();
  });

  it("envia uma única atualização atômica derivada da sessão", async () => {
    await expect(
      updateWorkspaceConfiguration(initialActionState, workspaceForm()),
    ).resolves.toMatchObject({ status: "success" });

    expect(workspaceMocks.rpc).toHaveBeenCalledWith(
      "update_current_workspace_configuration",
      expect.objectContaining({
        p_address_city: "Recife",
        p_default_alert_offsets: [30, 7, 1],
        p_tax_id: "12345678000195",
        p_timezone: "America/Recife",
        p_workspace_name: "Workspace Atualizado",
      }),
    );
  });

  it("rejeita documento fiscal incompleto antes de chamar a RPC", async () => {
    const result = await updateWorkspaceConfiguration(
      initialActionState,
      workspaceForm({ taxId: "123" }),
    );

    expect(result).toMatchObject({ status: "error", message: expect.stringMatching(/11 ou 14/i) });
    expect(workspaceMocks.rpc).not.toHaveBeenCalled();
  });

  it("exige confirmação reforçada antes de limpar dados operacionais", async () => {
    const invalid = new FormData();
    invalid.set("confirmation", "excluir");
    await expect(resetWorkspaceOperationalData(initialActionState, invalid)).resolves.toMatchObject(
      {
        status: "error",
      },
    );

    const valid = new FormData();
    valid.set("confirmation", "EXCLUIR TUDO");
    await expect(resetWorkspaceOperationalData(initialActionState, valid)).resolves.toMatchObject({
      status: "success",
    });
    expect(workspaceMocks.rpc).toHaveBeenCalledWith(
      "reset_current_workspace_operational_data_with_documents",
      { p_confirmation: "EXCLUIR TUDO" },
    );
  });

  it("remove do Storage os anexos devolvidos pela limpeza transacional", async () => {
    workspaceMocks.rpc.mockResolvedValue({
      data: ["workspace/fiscal/nota-1.pdf", "workspace/fiscal/nota-2.pdf"],
      error: null,
    });
    const valid = new FormData();
    valid.set("confirmation", "EXCLUIR TUDO");

    await resetWorkspaceOperationalData(initialActionState, valid);

    expect(workspaceMocks.storageFrom).toHaveBeenCalledWith("workspace-documents");
    expect(workspaceMocks.remove).toHaveBeenCalledWith([
      "workspace/fiscal/nota-1.pdf",
      "workspace/fiscal/nota-2.pdf",
    ]);
  });
});
