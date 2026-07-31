import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("abre o acesso seguro sem violações automáticas de acessibilidade", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /clareza financeira começa por um acesso seguro/i,
    }),
  ).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
});

for (const route of ["/login", "/cadastro"] as const) {
  test(`${route} oferece magic link com acessibilidade automática`, async ({ page }) => {
    await page.goto(route);

    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /link de acesso|criar minha conta/i }),
    ).toBeVisible();

    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityResults.violations).toEqual([]);
  });
}

for (const protectedRoute of ["/onboarding", "/perfil", "/configuracoes/empresa"] as const) {
  test(`${protectedRoute} rejeita sessão ausente`, async ({ page }) => {
    await page.goto(protectedRoute);

    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { name: /entre para cuidar/i })).toBeVisible();
  });
}
