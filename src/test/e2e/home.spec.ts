import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("abre a fundação técnica sem violações automáticas de acessibilidade", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /uma base segura para o financeiro crescer sem atalhos/i,
    }),
  ).toBeVisible();

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toEqual([]);
});
