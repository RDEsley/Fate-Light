import { cleanup, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/_actions/mvp", () => ({
  createCharge: vi.fn(),
  createExpense: vi.fn(),
}));

import { ChargeForm } from "@/app/cobrancas/charge-form";
import { ExpenseForm } from "@/app/despesas/expense-form";
import { DomainForm } from "@/app/dominios/domain-form";
import type { ActionState } from "@/lib/forms/action-state";

async function action(state: ActionState) {
  return state;
}

describe("mandatory dates on new records", () => {
  it("starts a new charge date blank and required", () => {
    render(<ChargeForm clients={[]} services={[]} />);

    expect(screen.getByRole("combobox", { name: "Vencimento" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Vencimento" })).toBeRequired();
  });

  it("starts a new expense date blank and required", () => {
    render(<ExpenseForm categoryOptions={[]} clients={[]} />);

    expect(screen.getByRole("combobox", { name: "Vencimento ou data" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Vencimento ou data" })).toBeRequired();
  });

  it("starts a new domain expiration blank and preserves an existing date", () => {
    render(<DomainForm action={action} clients={[]} />);
    expect(screen.getByRole("combobox", { name: "Data de expiração" })).toHaveValue("");

    cleanup();
    render(
      <DomainForm
        action={action}
        clients={[]}
        domain={{
          autoRenew: false,
          clientId: "client-id",
          cost: null,
          domain: "example.test",
          expiresOn: "2027-01-10",
          id: "domain-id",
          notes: null,
          paymentResponsibility: "Empresa",
          registrar: null,
        }}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Data de expiração" })).toHaveValue("10/01/2027");
  });
});
