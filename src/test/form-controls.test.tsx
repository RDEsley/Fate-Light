import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClientCombobox, DateField } from "@/components/ui/form-controls";

const clients = [
  { id: "a", name: "Ana Ativa", status: "active", tradeName: "Estúdio Ana" },
  { id: "b", name: "Bruno Inativo", status: "inactive", tradeName: null },
];

describe("form controls", () => {
  it("pesquisa, filtra e seleciona clientes sem percorrer uma lista longa", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <ClientCombobox clients={clients} />
      </form>,
    );

    await user.click(screen.getByRole("combobox", { name: "Cliente" }));
    expect(screen.getByRole("option", { name: /Ana Ativa/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Bruno Inativo/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inativos" }));
    await user.clear(screen.getByRole("combobox", { name: "Cliente" }));
    await user.type(screen.getByRole("combobox", { name: "Cliente" }), "Bruno");
    await user.click(screen.getByRole("option", { name: /Bruno Inativo/ }));

    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("Bruno Inativo");
    expect(container.querySelector<HTMLInputElement>('input[name="clientId"]')).toHaveValue("b");
  });

  it("usa calendário e valor de envio em português do Brasil", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <DateField defaultValue="2026-08-03" label="Vencimento" name="dueDate" required />
      </form>,
    );

    expect(screen.getByLabelText("Vencimento")).toHaveValue("03/08/2026");
    await user.click(screen.getByLabelText("Vencimento"));
    expect(screen.getByRole("dialog")).toHaveTextContent("agosto de 2026");
    await user.click(screen.getByRole("gridcell", { name: "15/08/2026" }));
    expect(screen.getByLabelText("Vencimento")).toHaveValue("15/08/2026");
    expect(container.querySelector<HTMLInputElement>('input[name="dueDate"]')).toHaveValue(
      "2026-08-15",
    );
  });

  it("aceita digitação DD/MM/AAAA e converte para ISO no envio", async () => {
    const user = userEvent.setup();
    const { container } = render(<DateField label="Vencimento" name="dueDate" required />);

    await user.type(screen.getByLabelText("Vencimento"), "31122026");
    expect(screen.getByLabelText("Vencimento")).toHaveValue("31/12/2026");
    expect(container.querySelector<HTMLInputElement>('input[name="dueDate"]')).toHaveValue(
      "2026-12-31",
    );
  });
});
