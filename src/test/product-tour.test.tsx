import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ProductTour,
  tourCompleteStorageKey,
} from "@/app/_components/product-tour";

describe("ProductTour", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("avança pelos passos no dashboard sem sair da tela atual", async () => {
    const user = userEvent.setup();
    render(
      <>
        <nav aria-label="Navegação principal">
          <Link data-tour="nav-dashboard" href="/dashboard">
            Visão geral
          </Link>
          <Link data-tour="nav-clientes" href="/clientes">
            Clientes
          </Link>
          <Link data-tour="nav-servicos" href="/servicos">
            Serviços
          </Link>
          <Link data-tour="nav-cobrancas" href="/cobrancas">
            Cobranças
          </Link>
          <details data-tour="notifications">
            <summary>Notificações</summary>
          </details>
        </nav>
        <ProductTour />
      </>,
    );

    expect(await screen.findByRole("heading", { name: "Tudo começa aqui" })).toBeVisible();
    expect(screen.getByText(/permanece neste painel/i)).toBeVisible();
    expect(document.querySelector(".tour__scrim")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector(".tour__spotlight")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(await screen.findByRole("heading", { name: "Primeiro o cliente" })).toBeVisible();
    expect(screen.getByText(/aba Clientes/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(await screen.findByRole("heading", { name: "Depois o serviço" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(await screen.findByRole("heading", { name: "As cobranças se cuidam" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Próximo" }));
    expect(await screen.findByRole("heading", { name: "Nada vence sem aviso" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Começar a usar" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(tourCompleteStorageKey)).toBe("yes");
  });

  it("não reabre depois de concluído", async () => {
    window.localStorage.setItem(tourCompleteStorageKey, "yes");
    render(<ProductTour />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
