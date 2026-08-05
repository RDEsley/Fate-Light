import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { SelectField } from "@/components/ui/select-field";
import { SoftSubmitButton } from "@/components/ui/soft-submit-button";

const options = [
  { label: "Todo mês", value: "monthly" },
  { description: "Cobra uma vez só", label: "Uma única vez", value: "single" },
  { label: "Todo ano", value: "annual" },
];

function stubViewport(viewportHeight: number, top: number, height = 40) {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: viewportHeight });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    bottom: top + height,
    height,
    left: 0,
    right: 200,
    top,
    width: 200,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

describe("select field", () => {
  afterEach(() => vi.restoreAllMocks());

  it("guarda o valor escolhido no campo enviado com o formulário", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SelectField label="Periodicidade" name="billingType" options={options} />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /Uma única vez/ }));

    expect(container.querySelector("input[name='billingType']")).toHaveValue("single");
    expect(screen.getByRole("combobox")).toHaveTextContent("Uma única vez");
  });

  it("navega e seleciona pelo teclado", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SelectField
        defaultValue="monthly"
        label="Periodicidade"
        name="billingType"
        options={options}
      />,
    );

    screen.getByRole("combobox").focus();
    // A primeira seta apenas abre a lista sobre o item já selecionado.
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");

    expect(container.querySelector("input[name='billingType']")).toHaveValue("annual");
  });

  it("abre para cima quando não há espaço abaixo do gatilho", async () => {
    const user = userEvent.setup();
    stubViewport(600, 540);

    render(<SelectField label="Periodicidade" name="billingType" options={options} />);
    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toHaveAttribute("data-placement", "top");
  });

  it("abre para baixo quando há espaço sobrando", async () => {
    const user = userEvent.setup();
    stubViewport(900, 120);

    render(<SelectField label="Periodicidade" name="billingType" options={options} />);
    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toHaveAttribute("data-placement", "bottom");
  });
});

describe("soft submit button", () => {
  it("avisa no primeiro clique e envia no segundo", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input defaultValue="" name="listPrice" />
        <SoftSubmitButton
          idleLabel="Aplicar serviço"
          requirements={[{ message: "Informe o valor cheio do serviço.", name: "listPrice" }]}
        />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));
    expect(screen.getByText("Informe o valor cheio do serviço.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("envia direto quando os campos importantes estão preenchidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input defaultValue="1500" name="listPrice" />
        <SoftSubmitButton
          idleLabel="Aplicar serviço"
          requirements={[
            { message: "Informe o valor cheio do serviço.", name: "listPrice", warnOnZero: true },
          ]}
        />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Informe o valor cheio do serviço.")).not.toBeInTheDocument();
  });

  it("trata zero como campo por preencher quando pedido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <input defaultValue="0" name="listPrice" />
        <SoftSubmitButton
          idleLabel="Aplicar serviço"
          requirements={[
            { message: "Informe o valor cheio do serviço.", name: "listPrice", warnOnZero: true },
          ]}
        />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Aplicar serviço" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Informe o valor cheio do serviço.")).toBeInTheDocument();
  });
});
