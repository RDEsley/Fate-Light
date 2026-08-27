import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FinancialPrivacy } from "@/app/dashboard/financial-privacy";

it("oculta e restaura valores financeiros sem removê-los da acessibilidade", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <FinancialPrivacy>
      <span data-financial-value>R$ 1.000,00</span>
    </FinancialPrivacy>,
  );

  await user.click(screen.getByRole("button", { name: "Esconder valores" }));
  expect(container.firstChild).toHaveClass("financial-privacy--hidden");
  expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Mostrar valores" }));
  expect(container.firstChild).not.toHaveClass("financial-privacy--hidden");
});
