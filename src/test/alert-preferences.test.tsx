import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/perfil/actions", () => ({
  updateAlertPreferences: vi.fn(),
}));

import { AlertPreferences } from "@/app/perfil/alert-preferences";

describe("AlertPreferences", () => {
  it("organiza as antecedências da menor para a maior", () => {
    render(<AlertPreferences offsets={[30, 7, 1]} />);

    expect(screen.getAllByRole("checkbox").map((option) => option.getAttribute("value"))).toEqual([
      "0",
      "1",
      "3",
      "7",
      "15",
      "30",
      "60",
    ]);
  });

  describe("antecedência personalizada", () => {
    const checkedValues = () =>
      screen
        .getAllByRole("checkbox")
        .filter((option) => (option as HTMLInputElement).checked)
        .map((option) => option.getAttribute("value"));
    const customField = () => document.getElementById("custom-alert-offset") as HTMLInputElement;

    it("acrescenta um valor fora da lista, já marcado e em ordem", () => {
      render(<AlertPreferences offsets={[7, 30]} />);

      fireEvent.click(screen.getByRole("button", { name: /personalizado/i }));
      fireEvent.change(customField(), { target: { value: "45" } });
      fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

      expect(screen.getByRole("checkbox", { name: "45 dias" })).toBeChecked();
      expect(checkedValues()).toEqual(["7", "30", "45"]);
      expect(customField()).toBeNull();
    });

    it("mantém um valor personalizado já salvo e marca um existente em vez de duplicar", () => {
      render(<AlertPreferences offsets={[1, 90]} />);
      expect(screen.getByRole("checkbox", { name: "90 dias" })).toBeChecked();

      fireEvent.click(screen.getByRole("button", { name: /personalizado/i }));
      fireEvent.change(customField(), { target: { value: "15" } });
      fireEvent.keyDown(customField(), { key: "Enter" });

      expect(screen.getAllByRole("checkbox", { name: "15 dias" })).toHaveLength(1);
      expect(checkedValues()).toEqual(["1", "15", "90"]);
    });

    it("explica o limite em vez de salvar um valor inválido e fecha com Escape", () => {
      render(<AlertPreferences offsets={[7]} />);

      fireEvent.click(screen.getByRole("button", { name: /personalizado/i }));
      fireEvent.change(customField(), { target: { value: "900" } });
      fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

      expect(screen.getByText(/número inteiro de 0 a 365/i)).toBeInTheDocument();
      expect(checkedValues()).toEqual(["7"]);

      fireEvent.keyDown(customField(), { key: "Escape" });
      expect(customField()).toBeNull();
    });
  });
});
