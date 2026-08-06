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

  it("barra o envio sem cliente escolhido pelo campo visível, não pelo oculto", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <ClientCombobox clients={clients} />
      </form>,
    );

    // Campo oculto fica fora da validação de restrições do HTML: marcá-lo como `required`
    // não impedia nada, então a exigência precisa viver no input que o usuário enxerga.
    const hidden = container.querySelector<HTMLInputElement>('input[name="clientId"]')!;
    expect(hidden).not.toHaveAttribute("required");

    const search = screen.getByRole("combobox", { name: "Cliente" }) as HTMLInputElement;
    expect(search.checkValidity()).toBe(false);
    expect(search.validationMessage).toBe("Escolha um cliente da lista.");

    await user.click(search);
    await user.click(screen.getByRole("option", { name: /Ana Ativa/ }));

    expect(search.checkValidity()).toBe(true);
  });

  it("não exige seleção quando o cliente é opcional", () => {
    render(
      <form>
        <ClientCombobox clients={clients} optional />
      </form>,
    );

    const search = screen.getByRole("combobox", { name: /Cliente/ }) as HTMLInputElement;
    expect(search.checkValidity()).toBe(true);
  });

  it("mostra o erro do campo de data abaixo do controle", () => {
    render(
      <DateField
        error="O primeiro vencimento não pode ser anterior ao início do serviço."
        label="Primeiro vencimento"
        name="nextDueDate"
        required
      />,
    );

    expect(
      screen.getByText("O primeiro vencimento não pode ser anterior ao início do serviço."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Primeiro vencimento")).toHaveAttribute("aria-invalid", "true");
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
