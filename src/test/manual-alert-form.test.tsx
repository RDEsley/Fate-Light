import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/alertas/actions", () => ({
  createManualAlert: vi.fn(),
}));

import { ManualAlertForm } from "@/app/alertas/manual-alert-form";

describe("manual alert form", () => {
  const dueOn = () => document.querySelector<HTMLInputElement>('input[name="dueOn"]');

  it("começa sem data e com prioridade de atenção", () => {
    render(<ManualAlertForm today="2026-10-08" />);

    expect(dueOn()).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Atenção" })).toBeChecked();
    expect(screen.getByLabelText("O que lembrar")).toBeRequired();
  });

  it("preenche a data pelo atalho escolhido e marca qual está valendo", () => {
    render(<ManualAlertForm today="2026-10-08" />);

    fireEvent.click(screen.getByRole("button", { name: "Em 7 dias" }));
    expect(dueOn()).toHaveValue("2026-10-15");
    expect(screen.getByRole("button", { name: "Em 7 dias" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Amanhã" }));
    expect(dueOn()).toHaveValue("2026-10-09");
    expect(screen.getByRole("button", { name: "Em 7 dias" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("guarda cliente e repetição em um bloco recolhido, sem repetir por padrão", () => {
    render(
      <ManualAlertForm
        clients={[
          { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Padaria", status: "active" },
        ]}
        today="2026-10-08"
      />,
    );

    const more = screen.getByText("Personalizar lembrete").closest("details");
    expect(more).not.toHaveAttribute("open");
    expect(screen.getByRole("radio", { name: "Não repetir" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Todo mês" })).not.toBeChecked();
    expect(screen.getByRole("combobox", { name: /^cliente/i })).not.toBeRequired();
  });

  it("não mostra o campo de cliente enquanto não há clientes cadastrados", () => {
    render(<ManualAlertForm today="2026-10-08" />);

    expect(screen.queryByRole("combobox", { name: /^cliente/i })).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Repetir" })).toBeInTheDocument();
  });
});
