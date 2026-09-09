import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...props }, children),
}));

import { Icon } from "@/components/ui/icon";

describe("Icon contact glyphs", () => {
  it("expõe phone e mail com data-icon", () => {
    const { container, rerender } = render(<Icon name="phone" />);
    expect(container.querySelector('[data-icon="phone"]')).toBeInTheDocument();
    rerender(<Icon name="mail" />);
    expect(container.querySelector('[data-icon="mail"]')).toBeInTheDocument();
  });
});

describe("client detail CTA copy helpers", () => {
  it("marca Novo serviço como ação principal esperada na ficha", () => {
    // Contrato de UX: o CTA principal da ficha aponta para #servicos, não cobrança avulsa.
    const href = `/clientes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?action=new-service#servicos`;
    expect(href).toContain("action=new-service");
    expect(href).toContain("#servicos");
    expect(href).not.toContain("new-charge");
  });
});

describe("ClientForm prior revenue copy", () => {
  it("apresenta receita anterior ao Fate Light recolhida por padrão", async () => {
    const { ClientForm } = await import("@/app/clientes/client-form");
    const action = vi.fn(async () => ({ status: "idle" as const }));
    render(
      <ClientForm action={action} cancelHref="/clientes" submitLabel="Salvar cliente" />,
    );

    const disclosure = screen.getByText("Receita anterior ao Fate Light").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(
      screen.getByText(/já pagava você antes de começar a usar o sistema/i),
    ).toBeInTheDocument();
  });
});
