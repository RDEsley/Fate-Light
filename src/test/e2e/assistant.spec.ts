import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const question = "Quem está me devendo há mais de 30 dias? Cria um lembrete pra cada um";

// Usa o modelo roteirizado (AGENT_SCRIPTED_MODEL): nenhuma chamada sai para um provedor de IA.
// Contas reais ficam desligadas até a revisão da privacidade: o painel explica com simpatia.
test.describe("assistente em fase de testes para contas", () => {
  test.describe.configure({ timeout: 120_000 });

  test("mostra o aviso amigável e nenhum campo de pergunta", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("fate-light:tour-complete", "yes"));
    await page.route("**/api/agent", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ json: { guest: false, status: "real_data_disabled" } })
        : route.continue(),
    );
    await page.goto("/login");
    await page.getByRole("button", { name: "Explorar como visitante" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Abrir assistente" }).click();

    const panel = page.getByRole("dialog", { name: "Assistente" });
    await expect(panel.getByText("Em desenvolvimento · fase de testes")).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Indisponível por enquanto" })).toBeVisible();
    await expect(panel.getByText("Explorar como visitante")).toBeVisible();
    await expect(panel.getByLabel("Sua pergunta")).toHaveCount(0);
    await page.screenshot({
      path: process.env.ASSISTANT_SHOT ?? "test-results/assistant-notice.png",
    });

    const critical = (
      await new AxeBuilder({ page }).include("[role=dialog]").analyze()
    ).violations.filter(({ impact }) => impact === "critical");
    expect(critical).toEqual([]);
  });
});

test.describe("assistente no modo visitante", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("fate-light:tour-complete", "yes"));
    await page.goto("/login");
    await page.getByRole("button", { name: "Explorar como visitante" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Abrir assistente" }).click();
  });

  const panelOf = (page: Page) => page.getByRole("dialog", { name: "Assistente" });

  async function ask(page: Page, text = question) {
    const panel = panelOf(page);
    await panel.getByLabel("Sua pergunta").fill(text);
    await panel.getByRole("button", { name: "Enviar" }).click();
    return panel;
  }

  async function askAndWaitForApproval(page: Page) {
    const panel = await ask(page);
    await expect(panel.getByText("Listar clientes em atraso")).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText("Atraso de mais de 30 dias")).toBeVisible();
    await expect(panel.getByText("Criar 2 lembretes?")).toBeVisible();
    await expect(panel.getByText("Studio Movimento")).toBeVisible();
    await expect(panel.getByText("Auto Center Rota 10")).toBeVisible();
    await expect(panel.getByText("Total em atraso")).toBeVisible();
    return panel;
  }

  test("abre com boas-vindas e sugestões, sem violações críticas de acessibilidade", async ({
    page,
  }) => {
    const panel = panelOf(page);
    await expect(panel.getByRole("heading", { name: "Olá, Visitante!" })).toBeVisible();
    await expect(panel.getByText("Demonstração · dados fictícios")).toBeVisible();
    await expect(panel.getByRole("button", { name: /Resumo do mês/ })).toBeVisible();

    const critical = (
      await new AxeBuilder({ page }).include("[role=dialog]").analyze()
    ).violations.filter(({ impact }) => impact === "critical");
    expect(critical).toEqual([]);
  });

  test("pergunta, mostra as tools, pede confirmação e cria ao aprovar", async ({ page }) => {
    const panel = await askAndWaitForApproval(page);

    await panel.getByRole("button", { name: "Aprovar" }).click();
    await expect(panel.getByText("Pronto, os lembretes foram criados.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText("2 lembretes criados (simulado)")).toBeVisible();
    await expect(panel.getByText(/2 lembretes simulados nesta sessão/)).toBeVisible();
  });

  test("cancelar não cria lembrete", async ({ page }) => {
    const panel = await askAndWaitForApproval(page);
    await panel.getByRole("button", { name: "Cancelar" }).click();
    await expect(panel.getByText("Tudo bem, nenhum lembrete foi criado.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText(/lembretes simulados/)).toHaveCount(0);
  });

  test("guarda no histórico, reabre, avalia a resposta e apaga", async ({ page }) => {
    const panel = await askAndWaitForApproval(page);
    await panel.getByRole("button", { name: "Cancelar" }).click();
    await expect(panel.getByText("Tudo bem, nenhum lembrete foi criado.")).toBeVisible({
      timeout: 30_000,
    });

    // Feedback simples: gostei e não gostei, com motivo opcional.
    const dislike = panel.getByRole("button", { name: "Não gostei da resposta" });
    await dislike.click();
    await expect(dislike).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: "Incompleto" }).click();
    await expect(panel.getByRole("button", { name: "Incompleto" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Nova conversa começa vazia; a anterior fica no histórico.
    await panel.getByRole("button", { name: "Nova conversa" }).click();
    await expect(panel.getByRole("heading", { name: "Olá, Visitante!" })).toBeVisible();
    await panel.getByRole("button", { name: "Histórico de conversas" }).click();
    const saved = panel.getByRole("button", { name: /^Quem está me devendo/ });
    await expect(saved).toBeVisible();

    // Reabrir traz de volta a conversa e a avaliação.
    await saved.click();
    await expect(panel.getByText("Tudo bem, nenhum lembrete foi criado.")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Não gostei da resposta" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Excluir remove do histórico.
    await panel.getByRole("button", { name: "Histórico de conversas" }).click();
    // Reabrir não duplica a conversa no histórico.
    await expect(panel.getByRole("button", { name: /Excluir a conversa/ })).toHaveCount(1);
    await panel.getByRole("button", { name: /Excluir a conversa/ }).click();
    await expect(panel.getByText("Nenhuma conversa ainda")).toBeVisible();
  });

  test("limpa a conversa com confirmação e expande o painel", async ({ page }) => {
    const panel = await ask(page, "Quem está devendo?");
    await expect(panel.getByText(/Encontrei \d+ cobranças em atraso/)).toBeVisible({
      timeout: 30_000,
    });

    await panel.getByRole("button", { name: "Mais opções" }).click();
    await panel.getByRole("menuitem", { name: "Expandir painel" }).click();
    // A largura anima em 220 ms: espera assentar em vez de medir no meio da transição.
    await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThan(560);

    await panel.getByRole("button", { name: "Mais opções" }).click();
    await panel.getByRole("menuitem", { name: "Limpar esta conversa" }).click();
    await panel.getByRole("menuitem", { name: /Confirmar: limpar conversa/ }).click();
    await expect(panel.getByRole("heading", { name: "Olá, Visitante!" })).toBeVisible();
  });

  test("em tela de celular o painel ocupa a tela inteira e cabe na largura", async ({ page }) => {
    await page.setViewportSize({ height: 800, width: 360 });
    const panel = panelOf(page);
    await expect(panel).toBeVisible();
    // A folha entra com uma animação curta: espera ela assentar antes de medir.
    await expect
      .poll(async () => (await panel.boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(359);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });
});
