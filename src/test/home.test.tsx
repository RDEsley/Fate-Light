import { render, screen } from "@testing-library/react";

import Home from "@/app/page";

describe("Home", () => {
  it("apresenta acesso seguro para login e cadastro", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /sua rotina financeira pode ser leve/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByRole("link", { name: /^entrar$/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByText(/gestão financeira sem cara de planilha/i)).not.toBeInTheDocument();
    expect(screen.getByText(/resumo operacional/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /operação em um só lugar/i })).toBeInTheDocument();
    expect(document.querySelectorAll(".landing-preview__card--wide")).toHaveLength(2);
    expect(document.querySelector(".landing-water-cursor")).toBeInTheDocument();
    expect(document.querySelectorAll(".landing-hero__word")).toHaveLength(6);
    expect(document.querySelector(".landing-hero__period")).toHaveTextContent(".");
    expect(document.querySelectorAll(".landing-feather")).toHaveLength(2);
  });
});
