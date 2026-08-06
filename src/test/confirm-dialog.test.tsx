import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function renderInForm(properties: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <ConfirmDialog confirmation="Isso não pode ser desfeito." label="Excluir" {...properties} />
    </form>,
  );
  return onSubmit;
}

describe("confirm dialog", () => {
  it("não envia o formulário antes da confirmação", async () => {
    const user = userEvent.setup();
    const onSubmit = renderInForm();

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envia o formulário ao confirmar", async () => {
    const user = userEvent.setup();
    const onSubmit = renderInForm({ confirmLabel: "Excluir agora" });

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.click(screen.getByRole("button", { name: "Excluir agora" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("fecha sem enviar ao voltar ou pressionar Escape", async () => {
    const user = userEvent.setup();
    const onSubmit = renderInForm();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exige a frase exata quando a exclusão é irreversível", async () => {
    const user = userEvent.setup();
    const onSubmit = renderInForm({ confirmLabel: "Confirmar", requiredPhrase: "Padaria do João" });

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    const confirmButton = screen.getByRole("button", { name: "Confirmar" });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "Padaria");
    expect(screen.getByText("A frase ainda não confere.")).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByRole("textbox"), " do João");
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("mantém a confirmação travada durante a contagem e libera ao fim", () => {
    // fireEvent em vez de userEvent: userEvent tem loop próprio de espera e não combina
    // com timers falsos sem travar o teste.
    vi.useFakeTimers();
    try {
      const onSubmit = renderInForm({ confirmLabel: "Excluir agora", holdSeconds: 3 });

      fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
      expect(screen.getByRole("button", { name: "Aguarde 3s…" })).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole("button", { name: "Aguarde 2s…" })).toBeDisabled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const confirmButton = screen.getByRole("button", { name: "Excluir agora" });
      expect(confirmButton).toBeEnabled();
      fireEvent.click(confirmButton);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("devolve o foco ao gatilho depois de fechar", async () => {
    const user = userEvent.setup();
    renderInForm();
    const trigger = screen.getByRole("button", { name: "Excluir" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveFocus();
  });
});
