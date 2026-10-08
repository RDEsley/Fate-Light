import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { clearToasts } from "@/components/ui/toast-store";
import { StatusToast, Toaster } from "@/components/ui/toaster";

describe("aviso do resultado de uma ação redirecionada", () => {
  beforeEach(() => clearToasts());
  afterEach(() => {
    act(() => clearToasts());
    window.history.replaceState(null, "", "/");
  });

  it("mostra o aviso e tira o resultado da URL, preservando o resto", () => {
    window.history.replaceState(null, "", "/clientes/abc?status=service-created&entity=1#servicos");

    render(
      <>
        <Toaster />
        <StatusToast message="Serviço aplicado e cobrança criada." tone="success" />
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Serviço aplicado e cobrança criada.");
    // Recarregar ou voltar no histórico não pode repetir o aviso de uma ação já concluída.
    expect(window.location.search).toBe("?entity=1");
    expect(window.location.hash).toBe("#servicos");
    expect(window.location.pathname).toBe("/clientes/abc");
  });

  it("fica calado quando a URL não traz resultado", () => {
    window.history.replaceState(null, "", "/clientes/abc");

    render(
      <>
        <Toaster />
        <StatusToast message="Cliente atualizado." tone="success" />
      </>,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
