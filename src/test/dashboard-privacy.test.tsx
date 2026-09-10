import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  FinancialPrivacy,
  financialPrivacyStorageKey,
} from "@/app/dashboard/financial-privacy";

describe("FinancialPrivacy", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("oculta e restaura valores financeiros sem removê-los da acessibilidade", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <div id="financial-privacy-control" />
        <FinancialPrivacy>
          <span data-financial-value>R$ 1.000,00</span>
        </FinancialPrivacy>
      </>,
    );

    await user.click(await screen.findByRole("button", { name: "Esconder valores" }));
    expect(container.querySelector(".financial-privacy")).toHaveClass("financial-privacy--hidden");
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
    expect(window.localStorage.getItem(financialPrivacyStorageKey)).toBe("on");

    await user.click(screen.getByRole("button", { name: "Mostrar valores" }));
    expect(container.querySelector(".financial-privacy")).not.toHaveClass(
      "financial-privacy--hidden",
    );
    expect(window.localStorage.getItem(financialPrivacyStorageKey)).toBe("off");
  });

  it("restaura a preferência salva no localStorage", async () => {
    window.localStorage.setItem(financialPrivacyStorageKey, "on");
    const { container } = render(
      <>
        <div id="financial-privacy-control" />
        <FinancialPrivacy>
          <span data-financial-value>R$ 250,00</span>
        </FinancialPrivacy>
      </>,
    );

    await waitFor(() => {
      expect(container.querySelector(".financial-privacy")).toHaveClass(
        "financial-privacy--hidden",
      );
    });
    expect(await screen.findByRole("button", { name: "Mostrar valores" })).toBeVisible();
  });
});
