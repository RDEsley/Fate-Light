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
  it("apresenta a fundação técnica sem simular funcionalidades de negócio", () => {
    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /uma base segura para o financeiro crescer sem atalhos/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/login, cadastro, perfil e regras financeiras/i)).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: /escopo desta fundação/i }),
    ).toBeInTheDocument();
  });
});
