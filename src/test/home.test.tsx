import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";

import Home from "@/app/page";
import { ThemeProvider } from "@/components/theme-provider";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  useTheme: () => ({
    setTheme: vi.fn(),
    theme: "system",
  }),
}));

describe("Home", () => {
  it("apresenta acesso seguro para login e cadastro", () => {
    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /clareza financeira começa por um acesso seguro/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: /^entrar$/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("complementary", { name: /proteções do acesso/i })).toBeInTheDocument();
  });
});
