import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ClientForm } from "@/app/clientes/client-form";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("ClientForm optional contact", () => {
  it("envia na primeira tentativa só com o nome", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      fieldErrors: {},
      message: undefined,
      status: "idle" as const,
      values: {},
    }));
    render(
      <ClientForm action={action} cancelHref="/clientes" submitLabel="Salvar cliente" />,
    );

    await user.type(screen.getByPlaceholderText("Ex.: Padaria do João"), "Padaria do João");
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/clique de novo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sem e-mail nem telefone/i)).not.toBeInTheDocument();
  });
});
