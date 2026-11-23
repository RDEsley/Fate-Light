import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const question = "Quem está me devendo há mais de 30 dias? Cria um lembrete pra cada um";

// Usa o modelo roteirizado (AGENT_SCRIPTED_MODEL): nenhuma chamada sai para um provedor de IA.
test.describe("assistente no modo visitante", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("fate-light:tour-complete", "yes"));
    await page.goto("/login");
    await page.getByRole("button", { name: "Explorar como visitante" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Abrir assistente" }).click();
  });

  async function ask(page: import("@playwright/test").Page) {
    const panel = page.getByRole("dialog", { name: "Assistente" });
    await panel.getByLabel("Sua pergunta").fill(question);
    await panel.getByRole("button", { name: "Enviar" }).click();
    await expect(panel.getByText("Listar clientes em atraso")).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText("Atraso de mais de 30 dias")).toBeVisible();
    await expect(panel.getByText("Confirma a criação destes lembretes?")).toBeVisible();
    await expect(panel.getByText(/Studio Movimento: R\$/)).toBeVisible();
    await expect(panel.getByText(/Auto Center Rota 10: R\$/)).toBeVisible();
    return panel;
  }

  test("pergunta, mostra as tools, pede confirmação e cria ao aprovar", async ({ page }) => {
    const panel = await ask(page);
    const critical = (
      await new AxeBuilder({ page }).include("[role=dialog]").analyze()
    ).violations.filter(({ impact }) => impact === "critical");
    expect(critical).toEqual([]);

    await panel.getByRole("button", { name: "Aprovar" }).click();
    await expect(panel.getByText("Pronto, os lembretes foram criados.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText(/2 lembrete\(s\) simulado\(s\)/)).toBeVisible();
  });

  test("cancelar não cria lembrete", async ({ page }) => {
    const panel = await ask(page);
    await panel.getByRole("button", { name: "Cancelar" }).click();
    await expect(panel.getByText("Tudo bem, nenhum lembrete foi criado.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText(/simulado\(s\)/)).toHaveCount(0);
  });
});
