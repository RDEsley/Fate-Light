import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IntegerField } from "@/components/ui/integer-field";
import { PercentField } from "@/components/ui/percent-field";

describe("PercentField", () => {
  it("aceita vírgula e envia canônico no hidden", async () => {
    const user = userEvent.setup();
    render(<PercentField label="Reajuste" name="adjustmentRate" optional />);

    const visible = screen.getByRole("textbox", { name: "Reajuste" });
    await user.type(visible, "5,5");

    expect(document.querySelector('input[name="adjustmentRate"]')).toHaveValue("5.5");
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
