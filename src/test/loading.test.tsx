import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/login" as string | null }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/app/(auth)/guest-actions", () => ({ leaveGuestMode: vi.fn() }));

import Loading from "@/app/loading";

describe("Loading", () => {
  it("informa o carregamento com um indicador visual não verbal", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent(/carregando dados do workspace/i);
    expect(document.querySelector(".cartoon-loader")).toHaveAttribute("aria-hidden", "true");
    // Fora do sistema (login, páginas públicas) não há menu para manter.
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).toBeNull();
  });

  it("mantém o menu e a barra do topo nas telas do sistema, com os dados da última tela", () => {
    navigation.pathname = "/cobrancas";
    window.sessionStorage.setItem(
      "fate-light:shell",
      JSON.stringify({
        attentionTotal: 3,
        fullName: "Pessoa Exemplo",
        guest: false,
        workspaceName: "Empresa",
      }),
    );

    render(<Loading />);

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cobranças/i, current: "page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menu do perfil" })).toHaveTextContent(
      "Pessoa Exemplo",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
    // O título da página só existe quando a página chega.
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    navigation.pathname = "/login";
  });
});
