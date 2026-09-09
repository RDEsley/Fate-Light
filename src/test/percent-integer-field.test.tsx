import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IntegerField } from "@/components/ui/integer-field";
import { MoneyField } from "@/components/ui/money-field";
import { PercentField } from "@/components/ui/percent-field";

describe("PercentField", () => {
  it("aceita vírgula e envia o mesmo canônico no hidden", async () => {
    const user = userEvent.setup();
    render(<PercentField label="Reajuste" name="adjustmentRate" optional />);

    const visible = screen.getByRole("textbox", { name: "Reajuste" });
    await user.type(visible, "5,5");

    expect(visible).toHaveValue("5,5");
    expect(document.querySelector('input[name="adjustmentRate"]')).toHaveValue("5.5");
  });

  it("envia 100 sem alterar o display", async () => {
    const user = userEvent.setup();
    render(<PercentField label="Desconto" name="discountValue" />);
    const visible = screen.getByRole("textbox", { name: "Desconto" });
    await user.type(visible, "100");
    expect(visible).toHaveValue("100");
    expect(document.querySelector('input[name="discountValue"]')).toHaveValue("100");
  });

  it("não faz clamp silencioso acima do max", async () => {
    const user = userEvent.setup();
    render(<PercentField label="Desconto" name="discountValue" />);
    const visible = screen.getByRole("textbox", { name: "Desconto" });
    await user.type(visible, "101");
    expect(visible).toHaveValue("101");
    expect(document.querySelector('input[name="discountValue"]')).toHaveValue("101");
    expect(visible).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/no máximo 100%/i)).toBeInTheDocument();
  });

  it("respeita max customizado", async () => {
    const user = userEvent.setup();
    render(<PercentField label="Taxa" max={50} name="rate" />);
    const visible = screen.getByRole("textbox", { name: "Taxa" });
    await user.type(visible, "51");
    expect(visible).toHaveValue("51");
    expect(document.querySelector('input[name="rate"]')).toHaveValue("51");
    expect(screen.getByText(/no máximo 50%/i)).toBeInTheDocument();
  });

  it("reidrata defaultValue", () => {
    render(<PercentField defaultValue={10} label="Desconto" name="discountValue" />);
    expect(screen.getByRole("textbox", { name: "Desconto" })).toHaveValue("10");
    expect(document.querySelector('input[name="discountValue"]')).toHaveValue("10");
  });
});

describe("IntegerField", () => {
  it("aceita só dígitos e respeita max", async () => {
    const user = userEvent.setup();
    render(<IntegerField label="Parcelas" max={12} min={1} name="installmentCount" />);

    const visible = screen.getByRole("textbox", { name: "Parcelas" });
    await user.type(visible, "99a");

    expect(visible).toHaveValue("12");
    expect(document.querySelector('input[name="installmentCount"]')).toHaveValue("12");
  });

  it("permite vazio quando opcional", async () => {
    const user = userEvent.setup();
    render(<IntegerField label="Ciclos" name="promotionalCycles" optional />);
    const visible = screen.getByRole("textbox", { name: "Ciclos" });
    await user.type(visible, "3");
    await user.clear(visible);
    expect(visible).toHaveValue("");
  });
});

describe("field accessibility", () => {
  it("liga aria-describedby do MoneyField ao FieldError real", () => {
    render(<MoneyField error="Valor inválido" label="Receita" name="companyRevenue" />);
    const visible = screen.getByRole("textbox", { name: "Receita" });
    const describedBy = visible.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorNode = document.getElementById(describedBy!);
    expect(errorNode).toHaveTextContent("Valor inválido");
  });

  it("liga aria-describedby do PercentField ao erro local", async () => {
    const user = userEvent.setup();
    render(<PercentField label="Taxa" name="rate" />);
    const visible = screen.getByRole("textbox", { name: "Taxa" });
    await user.type(visible, "150");
    const describedBy = visible.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(/no máximo 100%/i);
  });
});
