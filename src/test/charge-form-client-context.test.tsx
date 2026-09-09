import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(document.querySelector(`input[name="clientId"]`)).toHaveValue(clientId);
    expect(document.querySelector(`input[name="clientServiceId"]`)).toHaveValue("");
    expect(document.querySelector(`input[name="returnTo"]`)).toHaveValue(`/clientes/${clientId}`);
    expect(screen.getByText(/não altera a agenda automática/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Criar cobrança avulsa/i })).toBeInTheDocument();
  });

  it("esconde forma de pagamento até marcar como já paga", async () => {
    const user = userEvent.setup();
    render(<ChargeForm clientId={clientId} services={[]} />);

    expect(screen.queryByRole("combobox", { name: /Forma de pagamento/i })).not.toBeInTheDocument();
    expect(document.querySelector(`input[name="paymentMethod"]`)).toHaveValue("Pix");

    await user.click(screen.getByRole("checkbox", { name: /já foi paga/i }));
    expect(screen.getByRole("combobox", { name: /Forma de pagamento/i })).toBeInTheDocument();
  });

  it("guarda verba e adicional nas opções avançadas", async () => {
    const user = userEvent.setup();
    render(<ChargeForm clientId={clientId} services={[]} />);

    expect(screen.queryByRole("textbox", { name: /Verba de mídia/i })).not.toBeVisible();
    await user.click(screen.getByText(/Opções avançadas/i));
    expect(screen.getByRole("textbox", { name: /Verba de mídia/i })).toBeVisible();
  });
});
