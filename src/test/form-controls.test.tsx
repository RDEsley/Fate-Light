import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

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

  it("avisa a tela quando o cliente escolhido é desfeito pela digitação", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <form>
        <ClientCombobox clients={clients} onSelect={onSelect} optional />
      </form>,
    );
    const search = screen.getByRole("combobox", { name: /Cliente/ });

    await user.click(search);
    await user.click(screen.getByRole("option", { name: /Ana Ativa/ }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "a" }));

    // Sem este aviso a tela seguia oferecendo as empresas de um cliente já descartado.
    await user.type(search, "x");
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("escolhe pelo teclado, com setas e Enter", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <ClientCombobox
          clients={[...clients, { id: "c", name: "Carla Ativa", status: "active", tradeName: null }]}
        />
      </form>,
    );

    await user.click(screen.getByRole("combobox", { name: "Cliente" }));
    await user.keyboard("{ArrowDown}{Enter}");

    expect(container.querySelector<HTMLInputElement>('input[name="clientId"]')).toHaveValue("c");
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

  it("avisa quem observa o campo também ao escolher Hoje no calendário", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DateField label="Data de referência" name="date" onValueChange={onValueChange} />);

    await user.click(screen.getByLabelText("Data de referência"));
    await user.click(screen.getByRole("button", { name: "Hoje" }));

    // "Hoje" gravava o valor sem notificar: a prévia que depende da data não aparecia.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]![0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("libera o envio ao escolher um dia depois de digitar uma data incompleta", async () => {
    const user = userEvent.setup();
    render(<DateField defaultValue="2026-08-03" label="Vencimento" name="dueDate" required />);
    const field = screen.getByLabelText("Vencimento") as HTMLInputElement;

    await user.clear(field);
    await user.type(field, "31");
    expect(field.checkValidity()).toBe(false);
    expect(field.validationMessage).toBe("Informe uma data válida no formato DD/MM/AAAA.");

    // O bloqueio ficava preso no campo: a data escolhida era válida e o envio não saía.
    await user.click(screen.getByRole("gridcell", { name: "15/08/2026" }));
    expect(field).toHaveValue("15/08/2026");
    expect(field.checkValidity()).toBe(true);
  });

  it("fecha o calendário quando o foco vai para outro campo", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DateField label="Vencimento" name="dueDate" />
        <input aria-label="Outro campo" />
      </>,
    );

    await user.click(screen.getByLabelText("Vencimento"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Outro campo"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
