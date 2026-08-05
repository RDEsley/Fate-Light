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

for (const route of ["/login", "/cadastro"] as const) {
  test(`${route} oferece senha e escolha de magic link com acessibilidade`, async ({ page }) => {
    await page.goto(route);

    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel(/^Senha/)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar|criar conta/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /magic link/i })).toBeVisible();

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
    await expect(page.getByRole("heading", { name: /entre para cuidar/i })).toBeVisible();
  });
}
