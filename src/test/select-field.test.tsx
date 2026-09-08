import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { SelectField } from "@/components/ui/select-field";

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
