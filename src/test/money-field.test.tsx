import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MoneyField } from "@/components/ui/money-field";
import {
  appendDigit,
  centsToCanonical,
  centsToDisplay,
  digitsToCents,
  parseMoneyInputToCents,
  persistedToCents,
  removeLastDigit,
} from "@/features/mvp/money";

describe("money helpers", () => {
  it("desloca centavos na digitação", () => {
    expect(digitsToCents("1")).toBe(1);
    expect(digitsToCents("12")).toBe(12);
    expect(digitsToCents("123")).toBe(123);
    expect(digitsToCents("1234")).toBe(1234);
    expect(centsToDisplay(1)).toBe("R$\u00a00,01");
    expect(centsToDisplay(1234)).toBe("R$\u00a012,34");
    expect(centsToDisplay(1222222)).toBe("R$\u00a012.222,22");
    expect(centsToCanonical(1234)).toBe("12.34");
  });

  it("faz backspace e append", () => {
    expect(appendDigit(12, "3")).toBe(123);
    expect(removeLastDigit(1234)).toBe(123);
    expect(removeLastDigit(1)).toBeNull();
    expect(removeLastDigit(null)).toBeNull();
  });

  it("interpreta colagem brasileira", () => {
    expect(parseMoneyInputToCents("1234,56")).toBe(123456);
    expect(parseMoneyInputToCents("1.234,56")).toBe(123456);
    expect(parseMoneyInputToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyInputToCents("")).toBeNull();
  });

  it("reidrata valor persistido", () => {
    expect(persistedToCents("12.34")).toBe(1234);
    expect(persistedToCents(0)).toBe(0);
    expect(persistedToCents(null)).toBeNull();
    expect(persistedToCents("")).toBeNull();
  });
});

describe("MoneyField", () => {
  it("digita, apaga e envia valor canônico no hidden", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <MoneyField label="Valor" name="amount" />
      </form>,
    );

    const visible = screen.getByRole("textbox", { name: "Valor" });
    await user.click(visible);
    await user.keyboard("1234");

    expect(visible).toHaveValue("R$\u00a012,34");
    expect(document.querySelector('input[name="amount"]')).toHaveValue("12.34");

    await user.keyboard("{Backspace}");
    expect(visible).toHaveValue("R$\u00a01,23");
    expect(document.querySelector('input[name="amount"]')).toHaveValue("1.23");
  });

  it("aceita zero e permanece vazio quando opcional sem valor", () => {
    const { unmount } = render(
      <MoneyField defaultValue={0} label="Receita" name="companyRevenue" />,
    );
    expect(screen.getByRole("textbox", { name: "Receita" })).toHaveValue("R$\u00a00,00");
    expect(document.querySelector('input[name="companyRevenue"]')).toHaveValue("0.00");
    unmount();

    render(<MoneyField label="Opcional" name="priorRevenue" optional />);
    expect(screen.getByRole("textbox", { name: "Opcional" })).toHaveValue("");
    expect(document.querySelector('input[name="priorRevenue"]')).toHaveValue("");
  });

  it("cola valor formatado", async () => {
    const user = userEvent.setup();
    render(<MoneyField label="Despesa" name="amount" />);
    const visible = screen.getByRole("textbox", { name: "Despesa" });
    await user.click(visible);
    await user.paste("R$ 1.234,56");
    expect(visible).toHaveValue("R$\u00a01.234,56");
    expect(document.querySelector('input[name="amount"]')).toHaveValue("1234.56");
  });
});
