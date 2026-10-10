import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("abre o acesso seguro sem violações automáticas de acessibilidade", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /sua rotina financeira pode ser leve/i,
    }),
  ).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
});

test("a página de apoio mostra o Pix do desenvolvedor com acessibilidade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Apoiar o projeto" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Apoiar o Fate Light" })).toBeVisible();
  await expect(page.getByRole("img", { name: "QR Code do Pix" })).toBeVisible();
  await expect(page.getByText("Richard Esley Silva Oliveira").first()).toBeVisible();
  await page.getByRole("radio", { name: /10,00/ }).check({ force: true });
  await expect(page.locator("code")).toContainText("5303986540510.005802BR");
  await page.getByRole("radio", { name: "Outro valor" }).check({ force: true });
  await page.getByLabel("Valor em reais").fill("1.500");
  await expect(page.getByText(/Use só números/)).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
});

for (const route of ["/login", "/cadastro"] as const) {
  test(`${route} oferece autenticação por senha com acessibilidade`, async ({ page }) => {
    await page.goto(route);

    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel(/^Senha/)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar|criar conta/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /magic link/i })).toHaveCount(0);

    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityResults.violations).toEqual([]);
  });
}

for (const protectedRoute of [
  "/onboarding",
  "/perfil",
  "/configuracoes/empresa",
  "/dashboard",
  "/clientes",
  "/clientes/novo",
  "/servicos",
  "/cobrancas",
  "/despesas",
  "/dominios",
  "/alertas",
  "/historico",
  "/importar",
] as const) {
  test(`${protectedRoute} rejeita sessão ausente`, async ({ page }) => {
    await page.goto(protectedRoute);

    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { name: /bem-vindo de volta/i })).toBeVisible();
  });
}
