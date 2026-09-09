import { render, screen } from "@testing-library/react";

import { ClientStatusChip } from "@/features/clients/status-chip";

describe("ClientStatusChip", () => {
  it("destaca o selo Inativo com a classe semântica do status", () => {
    const { container } = render(<ClientStatusChip status="inactive" />);
    const chip = screen.getByText("Inativo");
    expect(chip).toHaveClass("client-status", "client-status--inactive", "client-status--inline");
    expect(container.querySelector('[data-icon="pause"]')).toBeInTheDocument();
  });

  it("mantém Lista negra e Arquivado com os selos corretos", () => {
    const { rerender, container } = render(<ClientStatusChip status="blacklist" />);
    expect(screen.getByText("Lista negra")).toHaveClass("client-status--blacklist");
    rerender(<ClientStatusChip status="archived" />);
    expect(screen.getByText("Arquivado")).toHaveClass("client-status--archived");
    expect(container.querySelector('[data-icon="archive"]')).toBeInTheDocument();
  });
});
