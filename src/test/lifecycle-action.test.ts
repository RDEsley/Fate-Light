import { vi } from "vitest";

const lifecycleMocks = vi.hoisted(() => ({
  claims: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: lifecycleMocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getClaims: lifecycleMocks.claims },
    rpc: lifecycleMocks.rpc,
  })),
}));

import { requestAccountDeletion, requestDataExport } from "@/app/perfil/lifecycle-actions";
import { initialActionState } from "@/lib/forms/action-state";

function deletionForm(confirmation = "EXCLUIR MINHA CONTA", acknowledged = true) {
  const formData = new FormData();
  formData.set("confirmation", confirmation);
  if (acknowledged) formData.set("acknowledged", "on");
  return formData;
}

describe("account lifecycle actions", () => {
  beforeEach(() => {
    lifecycleMocks.claims.mockReset();
    lifecycleMocks.claims.mockResolvedValue({
      data: { claims: { iat: Math.floor(Date.now() / 1000), sub: "verified-user-id" } },
      error: null,
    });
    lifecycleMocks.rpc.mockReset();
    lifecycleMocks.rpc.mockResolvedValue({
      data: [
        {
          request_created: true,
          request_id: "request-id",
          request_type: "export",
          requested_at: new Date().toISOString(),
          status: "requested",
        },
      ],
      error: null,
    });
    lifecycleMocks.revalidatePath.mockClear();
  });

  it("registra exportação sem aceitar identificador de usuário do formulário", async () => {
    const formData = new FormData();
    formData.set("userId", "third-party-id");

    await expect(requestDataExport(initialActionState, formData)).resolves.toMatchObject({
      status: "success",
    });
    expect(lifecycleMocks.rpc).toHaveBeenCalledWith("request_current_account_lifecycle", {
      p_request_type: "export",
    });
    expect(lifecycleMocks.revalidatePath).toHaveBeenCalledWith("/perfil");
  });

  it("rejeita exclusão sem confirmação reforçada", async () => {
    const result = await requestAccountDeletion(initialActionState, deletionForm("excluir", false));

    expect(result).toMatchObject({ status: "error" });
    expect(lifecycleMocks.claims).not.toHaveBeenCalled();
    expect(lifecycleMocks.rpc).not.toHaveBeenCalled();
  });

  it("exige autenticação recente para registrar exclusão", async () => {
    lifecycleMocks.claims.mockResolvedValue({
      data: { claims: { iat: Math.floor(Date.now() / 1000) - 601, sub: "verified-user-id" } },
      error: null,
    });

    const result = await requestAccountDeletion(initialActionState, deletionForm());

    expect(result).toMatchObject({ status: "error" });
    expect(lifecycleMocks.rpc).not.toHaveBeenCalled();
  });

  it("registra exclusão confirmada sem apagar ou suspender dados", async () => {
    await expect(requestAccountDeletion(initialActionState, deletionForm())).resolves.toMatchObject(
      { status: "success" },
    );
    expect(lifecycleMocks.rpc).toHaveBeenCalledWith("request_current_account_lifecycle", {
      p_request_type: "deletion",
    });
  });
});
