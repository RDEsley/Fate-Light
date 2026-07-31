import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ThemeSelect } from "@/components/ui/theme-select";

const themeMocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: themeMocks.setTheme,
    theme: "system",
  }),
}));

describe("ThemeSelect", () => {
  it("oferece um controle nomeado e aplica o tema escolhido", async () => {
    const user = userEvent.setup();
    render(<ThemeSelect />);

    const selector = screen.getByRole("combobox", { name: /selecionar tema/i });
    expect(selector).toHaveValue("system");

    await user.selectOptions(selector, "dark");

    expect(themeMocks.setTheme).toHaveBeenCalledWith("dark");
  });
});
