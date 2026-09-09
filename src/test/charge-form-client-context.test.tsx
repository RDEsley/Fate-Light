import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/_actions/mvp", () => ({
  createCharge: vi.fn(),
}));

import { ChargeForm } from "@/app/clientes/[clientId]/charge-form";

const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("ChargeForm no contexto do cliente", () => {
  it("não pede cliente, não grava vínculo de serviço e avisa quando há contexto", () => {
    render(
      <ChargeForm
        clientId={clientId}
        defaultServiceId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        services={[{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Gestão" }]}
      />,
    );

    expect(screen.queryByRole("combobox", { name: /Cliente/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Cobrança avulsa")).not.toBeInTheDocument();
    expect(document.querySelector(`input[name="clientId"]`)).toHaveValue(clientId);
    expect(document.querySelector(`input[name="clientServiceId"]`)).toHaveValue("");
    expect(document.querySelector(`input[name="returnTo"]`)).toHaveValue(`/clientes/${clientId}`);
    expect(screen.getByText(/não altera a agenda automática/i)).toBeInTheDocument();
  });
});
