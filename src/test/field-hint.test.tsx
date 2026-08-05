import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FieldHint } from "@/components/ui/field-hint";
import { Modal } from "@/components/ui/modal";

describe("field hint", () => {
  it("mostra a explicação ao passar o mouse e esconde ao sair", async () => {
    render(<FieldHint>Conta a partir do primeiro vencimento.</FieldHint>);
    const trigger = screen.getByRole("button", { name: "O que é isso?" });

    fireEvent.mouseEnter(trigger.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Conta a partir do primeiro vencimento.");

    fireEvent.mouseLeave(trigger.parentElement!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("abre pelo teclado e liga a explicação ao gatilho", async () => {
    const user = userEvent.setup();
    render(<FieldHint>Explicação acessível.</FieldHint>);
    const trigger = screen.getByRole("button", { name: "O que é isso?" });

    await user.tab();
    expect(trigger).toHaveFocus();

    const tooltip = screen.getByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("fecha com Escape", async () => {
    const user = userEvent.setup();
    render(<FieldHint>Explicação acessível.</FieldHint>);

    await user.click(screen.getByRole("button", { name: "O que é isso?" }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("modal", () => {
  function TrappedModal({ onClose = () => {} }: { onClose?: () => void }) {
    return (
      <Modal
        footer={<button type="button">Confirmar</button>}
        onClose={onClose}
        open
        title="Título do diálogo"
      >
        <input aria-label="Campo" />
      </Modal>
    );
  }

  it("prende o foco dentro do painel ao tabular", async () => {
    const user = userEvent.setup();
    render(<TrappedModal />);

    const closeButton = screen.getByRole("button", { name: "Fechar" });
    const field = screen.getByLabelText("Campo");
    const confirm = screen.getByRole("button", { name: "Confirmar" });

    await user.tab();
    expect(closeButton).toHaveFocus();
    await user.tab();
    expect(field).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();

    // No último item, Tab volta para o primeiro em vez de sair do diálogo.
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("fecha ao clicar fora do painel, mas não ao clicar dentro", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<TrappedModal onClose={onClose} />);

    await user.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(container.ownerDocument.querySelector(".modal-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("descreve o diálogo pelo título e pela descrição", () => {
    render(
      <Modal description="Isso não pode ser desfeito." onClose={() => {}} open title="Excluir">
        <p>Conteúdo</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)).toHaveTextContent(
      "Excluir",
    );
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)).toHaveTextContent(
      "Isso não pode ser desfeito.",
    );
  });
});
