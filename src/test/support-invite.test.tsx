import { act, fireEvent, render, screen } from "@testing-library/react";

import { DonationInvite } from "@/features/support/donation-invite";
import {
  cardHidden,
  countVisit,
  inviteSeen,
  restoreCard,
  settleInvite,
} from "@/features/support/invite";

const setVisits = (count: number) => window.localStorage.setItem("fate-light:visits", `${count}`);
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("contagem de visitas", () => {
  it("conta uma visita por abertura do sistema", () => {
    expect(countVisit()).toBe(1);
    expect(countVisit()).toBe(1);
    window.sessionStorage.clear();
    expect(countVisit()).toBe(2);
  });

  it("esquece o convite para quem copiou o código e devolve o cartão ao sair", () => {
    settleInvite();
    expect(inviteSeen()).toBe(true);
    expect(cardHidden()).toBe(true);
    restoreCard();
    expect(cardHidden()).toBe(false);
    expect(inviteSeen()).toBe(true);
  });
});

describe("DonationInvite", () => {
  it("mostra só o cartão nas primeiras visitas e o esconde com o menu recolhido", () => {
    const { rerender } = render(<DonationInvite />);
    wait(1500);
    expect(screen.getByRole("link", { name: "Ajudar com uma doação" })).toHaveAttribute(
      "href",
      "/apoiar",
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(<DonationInvite compact />);
    expect(screen.queryByRole("link", { name: "Ajudar com uma doação" })).toBeNull();
  });

  it("abre uma única vez na quinta visita, com os botões travados por dois segundos", () => {
    setVisits(4);
    const first = render(<DonationInvite />);
    wait(1500);
    expect(screen.getByRole("dialog", { name: "Que bom ter você por aqui!" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agora não" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quero ajudar" })).toBeDisabled();
    // Fechar antes da trava não faz nada.
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.getByRole("dialog", { name: "Que bom ter você por aqui!" })).toBeInTheDocument();

    wait(2000);
    expect(screen.getByRole("link", { name: "Quero ajudar" })).toHaveAttribute("href", "/apoiar");
    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(
      screen.getByRole("dialog", { name: "Tudo bem, obrigado mesmo assim!" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tudo bem" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("dialog", { name: "Que bom ter você por aqui!" })).toBeInTheDocument();
    wait(2000);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    wait(2000);
    fireEvent.click(screen.getByRole("button", { name: "Tudo bem" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    first.unmount();
    window.sessionStorage.clear();
    render(<DonationInvite />);
    wait(2000);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abre a janela mais uma vez quando o cartão é dispensado", () => {
    const first = render(<DonationInvite />);
    wait(1500);
    fireEvent.click(screen.getByRole("button", { name: "Dispensar o convite de apoio" }));
    expect(screen.getByRole("dialog", { name: "Que bom ter você por aqui!" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ajudar com uma doação" })).toBeNull();

    first.unmount();
    render(<DonationInvite />);
    wait(2000);
    expect(screen.queryByRole("link", { name: "Ajudar com uma doação" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
