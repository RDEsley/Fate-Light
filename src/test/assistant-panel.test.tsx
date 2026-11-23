import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { AssistantPanel } from "@/app/_components/assistant/assistant-panel";

function mockStatus(status: string, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ status }), ok })),
  );
}

async function openPanel(guest: boolean) {
  render(<AssistantPanel fullName="Ana Souza" guest={guest} workspaceName="Estúdio" />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir assistente" }));
  return screen.findByRole("dialog", { name: "Assistente" });
}

describe("painel do assistente", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("avisa com simpatia que as contas ainda estão em fase de testes", async () => {
    mockStatus("real_data_disabled");
    const panel = await openPanel(false);

    expect(await screen.findByText("Indisponível por enquanto")).toBeTruthy();
    expect(screen.getByText("Em desenvolvimento · fase de testes")).toBeTruthy();
    expect(screen.getByText("Explorar como visitante")).toBeTruthy();
    expect(panel.textContent).toContain("Em fase de testes");
    // Sem chat: nenhuma pergunta pode ser enviada a um provedor por essa tela.
    expect(screen.queryByLabelText("Sua pergunta")).toBeNull();
  });

  it("mostra indisponível no momento quando o assistente não está configurado", async () => {
    mockStatus("unavailable");
    await openPanel(false);
    expect(await screen.findByText("Indisponível no momento")).toBeTruthy();
  });

  it("também trata falha de rede como indisponível", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    await openPanel(true);
    expect(await screen.findByText("Indisponível no momento")).toBeTruthy();
  });

  it("abre o chat com boas-vindas no modo visitante", async () => {
    mockStatus("ready");
    await openPanel(true);

    expect(await screen.findByRole("heading", { name: "Olá, Ana!" })).toBeTruthy();
    expect(screen.getByText("Demonstração · dados fictícios")).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText("Sua pergunta")).toBeTruthy());
    expect(screen.getByRole("button", { name: /Cobranças em atraso/ })).toBeTruthy();
  });

  it("abre ao lado, não fecha ao clicar fora e fecha pelo X ou pelo botão do topo", async () => {
    mockStatus("ready");
    const panel = await openPanel(true);
    const root = document.documentElement;
    expect(root.hasAttribute("data-assistant-dock")).toBe(true);

    // Clicar na página não fecha: o painel é um acompanhante, não uma janela.
    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);
    expect(panel.hasAttribute("hidden")).toBe(false);

    fireEvent.click(within(panel).getByRole("button", { name: "Fechar assistente" }));
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(root.hasAttribute("data-assistant-dock")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente" }));
    expect(root.hasAttribute("data-assistant-dock")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Abrir assistente" }));
    expect(panel.hasAttribute("hidden")).toBe(true);
  });

  it("pede o aceite antes de usar com dados reais", async () => {
    mockStatus("consent_required");
    await openPanel(false);
    expect(await screen.findByText("Antes de usar com seus dados")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entendi e aceito" })).toBeTruthy();
  });
});
