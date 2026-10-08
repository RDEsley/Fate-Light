import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { blockedForGuest, GuestGuard } from "@/components/guest-guard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/toaster";
import { clearToasts } from "@/components/ui/toast-store";
import { guestNotice } from "@/lib/demo/guest";

function setup(form: React.ReactNode, guest = true) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const result = render(
    <div onSubmit={onSubmit}>
      {guest ? <GuestGuard /> : null}
      <Toaster />
      {form}
    </div>,
  );
  return { ...result, onSubmit };
}

describe("guest guard", () => {
  afterEach(() => {
    act(() => clearToasts());
  });

  it("barra o envio de formulários de ação e mostra o aviso com o caminho do cadastro", () => {
    const { onSubmit } = setup(
      <form method="post">
        <button type="submit">Salvar</button>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(guestNotice)).toBeInTheDocument();
    expect(screen.getByText("Modo visitante")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
  });

  it("barra também as ações que o React monta sem método, pelo botão ou pelo formulário", () => {
    const { onSubmit } = setup(
      <>
        <form action="javascript:throw new Error('React form unexpectedly submitted.')">
          <button type="submit">Excluir</button>
        </form>
        <form method="get">
          <button formAction="javascript:void 0" type="submit">
            Receber
          </button>
        </form>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    fireEvent.click(screen.getByRole("button", { name: "Receber" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("deixa passar busca, filtros e o formulário de saída", () => {
    const { onSubmit } = setup(
      <>
        <form action="/clientes" method="get">
          <button type="submit">Filtrar</button>
        </form>
        <form>
          <button type="submit">Buscar</button>
        </form>
        <form data-guest-allowed="" method="post">
          <button type="submit">Sair do modo visitante</button>
        </form>
      </>,
    );

    for (const name of ["Filtrar", "Buscar", "Sair do modo visitante"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }

    expect(onSubmit).toHaveBeenCalledTimes(3);
    expect(screen.queryByText(guestNotice)).not.toBeInTheDocument();
  });

  it("não interfere em quem tem conta", () => {
    const { onSubmit } = setup(
      <form method="post">
        <button type="submit">Salvar</button>
      </form>,
      false,
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(blockedForGuest()).toBe(false);
  });

  it("avisa antes de abrir uma confirmação e volta ao normal ao sair do modo", () => {
    const { unmount } = setup(
      <form method="post">
        <ConfirmDialog confirmation="Isso não pode ser desfeito." label="Excluir" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(guestNotice)).toBeInTheDocument();
    expect(blockedForGuest()).toBe(true);

    unmount();
    expect(blockedForGuest()).toBe(false);
  });
});
