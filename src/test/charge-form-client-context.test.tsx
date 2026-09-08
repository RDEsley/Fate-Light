import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/_actions/mvp", () => ({
  createCharge: vi.fn(),
}));

import { ChargeForm } from "@/app/clientes/[clientId]/charge-form";

const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("ChargeForm no contexto do cliente", () => {
  it("não oferece seletor de cliente e envia clientId oculto", () => {
    render(
      <ChargeForm
        clientId={clientId}
        services={[{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Gestão" }]}
      />,
    );

    expect(screen.queryByRole("combobox", { name: /Cliente/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Cobrança avulsa")).not.toBeInTheDocument();
    expect(document.querySelector(`input[name="clientId"]`)).toHaveValue(clientId);
    expect(document.querySelector(`input[name="returnTo"]`)).toHaveValue(`/clientes/${clientId}`);
  });
});
