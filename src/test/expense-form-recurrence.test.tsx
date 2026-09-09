import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/app/_actions/mvp", () => ({
  createExpense: vi.fn(),
}));

import { ExpenseForm } from "@/app/despesas/expense-form";

describe("ExpenseForm monthly vs variable", () => {
  it("mostra a opção de repetir todo mês apenas para despesa fixa", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm categoryOptions={[{ label: "Outros", value: "other" }]} clients={[]} />);

    expect(screen.getByText("Repetir todo mês")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /Tipo/ }));
    await user.click(screen.getByRole("option", { name: /Variável/ }));

    expect(screen.queryByText("Repetir todo mês")).not.toBeInTheDocument();
  });
});
