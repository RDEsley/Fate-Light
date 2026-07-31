import { vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveAccountDestination } from "@/lib/auth/account-gate";

describe("account destination", () => {
  it("direciona uma identidade ainda sem perfil para o onboarding", () => {
    expect(
      resolveAccountDestination({
        account_status: null,
        has_profile: false,
        has_workspace: false,
        workspace_status: null,
      }),
    ).toEqual({ kind: "onboarding", path: "/onboarding" });
  });

  it("bloqueia conta ou workspace fora do estado ativo", () => {
    expect(
      resolveAccountDestination({
        account_status: "suspended",
        has_profile: true,
        has_workspace: true,
        workspace_status: "active",
      }),
    ).toEqual({ kind: "suspended", path: "/conta-suspensa" });

    expect(
      resolveAccountDestination({
        account_status: "active",
        has_profile: true,
        has_workspace: true,
        workspace_status: "deletion_pending",
      }),
    ).toEqual({ kind: "suspended", path: "/conta-suspensa" });
  });

  it("aceita destino interno apenas para uma conta totalmente ativa", () => {
    const activeGate = {
      account_status: "active",
      has_profile: true,
      has_workspace: true,
      workspace_status: "active",
    };

    expect(resolveAccountDestination(activeGate, "/configuracoes/empresa")).toEqual({
      kind: "active",
      path: "/configuracoes/empresa",
    });
    expect(resolveAccountDestination(activeGate, "https://malicious.example")).toEqual({
      kind: "active",
      path: "/perfil",
    });
    expect(resolveAccountDestination(activeGate, "/auth/continue")).toEqual({
      kind: "active",
      path: "/perfil",
    });
  });

  it("falha fechado quando o estado não pode ser consultado", () => {
    expect(resolveAccountDestination(null)).toEqual({ kind: "error", path: "/auth/error" });
  });
});
