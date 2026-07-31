import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ThemeSelect } from "@/components/ui/theme-select";

const themeMocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  theme: "system" as string | undefined,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: themeMocks.setTheme,
    theme: themeMocks.theme,
  }),
}));

describe("ThemeSelect", () => {
  beforeEach(() => {
    themeMocks.theme = "system";
  });

  it("oferece um controle nomeado e aplica o tema escolhido", async () => {
    const user = userEvent.setup();
    render(<ThemeSelect />);

    const selector = screen.getByRole("combobox", { name: /selecionar tema/i });
    expect(selector).toHaveValue("system");

    await user.selectOptions(selector, "dark");

    expect(themeMocks.setTheme).toHaveBeenCalledWith("dark");
  });

  it("usa o tema do sistema enquanto a preferência ainda não foi hidratada", () => {
    themeMocks.theme = undefined;
    render(<ThemeSelect />);

    expect(screen.getByRole("combobox", { name: /selecionar tema/i })).toHaveValue("system");
  });
});
