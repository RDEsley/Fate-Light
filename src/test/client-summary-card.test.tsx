import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/app/clientes/actions", () => ({
  restoreClient: vi.fn(async () => {}),
  setClientStatus: vi.fn(async () => {}),
}));

import { setClientStatus } from "@/app/clientes/actions";
import { ClientSummaryCard } from "@/app/clientes/client-summary-card";

const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const baseProps = {
  activeServices: 2,
  clientId,
  earned: 1500,
  email: "contato@example.test",
  entityCount: 1,
  expiringDomains: 1,
  firstStart: "2025-01-15",
  links: [],
  name: "Padaria do João",
  notes: "Prefere Pix",
  overdueCharges: 1,
  phone: "(11) 98888-7777",
  showingArchived: false,
  status: "active",
  tenureLabel: "1 ano",
  tradeName: "João Alimentos",
  website: "padaria.example",
};

describe("ClientSummaryCard", () => {
  it("expõe link esticado para a ficha e atalhos sem aninhar âncoras", () => {
    const { container } = render(<ClientSummaryCard {...baseProps} />);

    const stretch = container.querySelector(".client-summary-card__stretch");
    expect(stretch).toHaveAttribute("href", `/clientes/${clientId}`);
    expect(stretch).toHaveAttribute("aria-label", "Abrir cliente Padaria do João");

    expect(screen.getByRole("link", { name: /2 serviço/i })).toHaveAttribute(
      "href",
      `/clientes/${clientId}#servicos`,
    );
    expect(screen.getByRole("link", { name: /empresa/i })).toHaveAttribute(
      "href",
      `/clientes/${clientId}#empresas`,
    );
    expect(screen.getByRole("link", { name: /vencida/i })).toHaveAttribute(
      "href",
      `/cobrancas?clientId=${clientId}&state=pending`,
    );
    expect(screen.getByRole("link", { name: /domínio/i })).toHaveAttribute(
      "href",
      `/dominios?clientId=${clientId}&state=expiring`,
    );
    expect(screen.getByRole("link", { name: /Já recebido/i })).toHaveAttribute(
      "href",
      `/cobrancas?clientId=${clientId}&state=paid`,
    );
    expect(screen.getByRole("link", { name: /Novo serviço/i })).toHaveAttribute(
      "href",
      `/clientes/${clientId}?action=new-service#servicos`,
    );

    expect(container.querySelector('a a')).toBeNull();
  });

  it("usa ícones de e-mail e telefone semanticamente corretos", () => {
    const { container } = render(<ClientSummaryCard {...baseProps} />);
    expect(container.querySelector('[data-icon="mail"]')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="phone"]')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="bell"]')).not.toBeInTheDocument();
    expect(
      container.querySelector('.client-card-contact [data-icon="user"]'),
    ).not.toBeInTheDocument();
  });

  it("permite alterar status pelo selo sem sair da lista", async () => {
    const user = userEvent.setup();
    render(<ClientSummaryCard {...baseProps} />);

    await user.click(screen.getByRole("button", { name: /Situação comercial: Ativo/i }));
    await user.click(screen.getByRole("menuitem", { name: "Inativo" }));

    expect(setClientStatus).toHaveBeenCalledTimes(1);
    const submitted = vi.mocked(setClientStatus).mock.calls[0][0] as FormData;
    expect(submitted.get("clientStatus")).toBe("inactive");
    expect(submitted.get("clientId")).toBe(clientId);
    expect(submitted.get("returnTo")).toBe("/clientes");
  });
});
