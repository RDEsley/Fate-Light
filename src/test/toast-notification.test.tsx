import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { ToastNotification } from "@/components/ui/toast-notification";
import { clearToasts, pushToast, readToasts } from "@/components/ui/toast-store";
import { StatusToast, Toaster } from "@/components/ui/toaster";

/** Tempo da animação de saída: o cartão só deixa o DOM depois dela. */
const exitAnimation = 200;

describe("toast notification", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pausa o fechamento durante o hover e retoma depois", () => {
    render(<ToastNotification message="Serviço aplicado" />);
    const toast = screen.getByRole("status");

    act(() => vi.advanceTimersByTime(2_000));
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(8_000));
    expect(toast).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(4_600));
    expect(toast).toHaveAttribute("data-leaving", "true");
    act(() => vi.advanceTimersByTime(exitAnimation));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("fecha pelo botão depois da animação de saída", () => {
    const onDismiss = vi.fn();
    render(<ToastNotification message="Revise os campos" onDismiss={onDismiss} tone="error" />);

    fireEvent.click(screen.getByRole("button", { name: "Fechar notificação" }));
    expect(screen.getByRole("alert")).toHaveAttribute("data-leaving", "true");

    act(() => vi.advanceTimersByTime(exitAnimation));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("usa o título próprio quando informado", () => {
    render(<ToastNotification message="Confira o campo “Nome”." title="Revise o formulário" />);

    expect(screen.getByText("Revise o formulário")).toBeInTheDocument();
    expect(screen.queryByText("Tudo certo")).not.toBeInTheDocument();
  });
});

describe("pilha de avisos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearToasts();
  });
  afterEach(() => {
    act(() => clearToasts());
    vi.useRealTimers();
  });

  it("mostra o aviso disparado por código e o remove ao expirar", () => {
    render(<Toaster />);

    act(() => pushToast({ message: "Cliente atualizado." }));
    expect(screen.getByRole("status")).toHaveTextContent("Cliente atualizado.");

    act(() => vi.advanceTimersByTime(6_500 + exitAnimation));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(readToasts()).toHaveLength(0);
  });

  it("reinicia o mesmo aviso em vez de empilhar cópias", () => {
    render(<Toaster />);

    act(() => pushToast({ message: "Confira o campo “Nome”.", tone: "error" }));
    act(() => vi.advanceTimersByTime(6_000));
    act(() => pushToast({ message: "Confira o campo “Nome”.", tone: "error" }));

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    // O tempo recomeçou: o aviso continua na tela depois do prazo do primeiro envio.
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("mantém só os avisos mais recentes quando chegam muitos de uma vez", () => {
    render(<Toaster />);

    act(() => {
      for (let index = 1; index <= 6; index += 1) pushToast({ message: `Aviso ${index}` });
    });

    expect(screen.getAllByRole("status")).toHaveLength(4);
    expect(screen.queryByText("Aviso 1")).not.toBeInTheDocument();
    expect(screen.getByText("Aviso 6")).toBeInTheDocument();
  });

  it("troca o resultado anterior pelo da ação mais recente", () => {
    render(<Toaster />);

    act(() => pushToast({ group: "status", message: "Serviço aplicado e cobrança criada." }));
    act(() => pushToast({ group: "status", message: "Cobrança criada neste cliente." }));
    act(() => pushToast({ message: "Aviso avulso", tone: "warning" }));

    // Dois resultados de ação lado a lado só confundem; o avulso convive com eles.
    expect(screen.queryByText("Serviço aplicado e cobrança criada.")).not.toBeInTheDocument();
    expect(screen.getByText("Cobrança criada neste cliente.")).toBeInTheDocument();
    expect(screen.getByText("Aviso avulso")).toBeInTheDocument();
  });

  it("leva o resultado de uma ação redirecionada para a pilha", () => {
    render(
      <>
        <Toaster />
        <StatusToast message="Serviço aplicado e cobrança criada." tone="success" />
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Serviço aplicado e cobrança criada.");
  });

  it("mostra o próximo passo dentro do aviso e o atualiza quando o aviso se repete", () => {
    render(<Toaster />);

    act(() =>
      pushToast({
        action: { href: "/cadastro", label: "Criar conta" },
        message: "Faça cadastro ou login.",
        tone: "info",
      }),
    );
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");

    act(() => pushToast({ message: "Faça cadastro ou login.", tone: "info" }));
    expect(readToasts()).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Criar conta" })).not.toBeInTheDocument();
  });
});
