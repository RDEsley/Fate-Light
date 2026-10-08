import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const notice = "Faça cadastro ou login para usar o sistema.";

// O modo visitante não usa sessão nem banco: roda com os mesmos placeholders das páginas
// públicas, sem depender da pilha do Supabase.
test.describe("modo visitante", () => {
  // Em modo dev cada rota compila na primeira visita: o padrão de 30 s fica curto no CI.
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    // O tutorial abriria por cima do painel na primeira visita.
    await page.addInitScript(() => window.localStorage.setItem("fate-light:tour-complete", "yes"));
    await page.goto("/login");
    await page.getByRole("button", { name: "Explorar como visitante" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  });

  test("mostra o sistema com dados fictícios e avisa que nada pode ser alterado", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Olá, Visitante!" })).toBeVisible();
    const banner = page.getByRole("complementary", { name: "Modo visitante" });
    await expect(banner).toContainText("Os dados são fictícios e nada pode ser alterado.");
    await expect(banner.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/cadastro",
    );
    const critical = (await new AxeBuilder({ page }).analyze()).violations.filter(
      ({ impact }) => impact === "critical",
    );
    expect(critical).toEqual([]);

    for (const [route, sample] of [
      ["/clientes", "Padaria Pão Dourado"],
      ["/servicos", "Gestão de redes sociais"],
      ["/despesas", "Hospedagem dos sites"],
      ["/dominios", "paodourado.example"],
      ["/alertas", "Enviar relatório trimestral"],
      ["/historico", "Cliente criado: Loja Verde Folha"],
      ["/perfil", "visitante@example.com"],
      ["/configuracoes/empresa", "Zona de risco"],
    ] as const) {
      await page.goto(route);
      // `#conteudo` é a área da página: o sino guarda títulos parecidos, mas fechados.
      await expect(page.locator("#conteudo").getByText(sample).first()).toBeVisible();
      await expect(page.getByRole("complementary", { name: "Modo visitante" })).toBeVisible();
    }
  });

  test("barra envio, confirmação e ação direta, mas deixa buscar e filtrar", async ({ page }) => {
    await page.goto("/cobrancas");
    const charge = "Banner para campanha de inverno";

    // Envio de formulário: o pagamento não é registrado e a pessoa continua onde estava.
    await page.getByRole("button", { name: `Receber ${charge}` }).click();
    await page.getByRole("button", { name: "Marcar como paga" }).click();
    await expect(page.getByText(notice)).toBeVisible();
    await expect(page).toHaveURL(/\/cobrancas$/);
    await page.getByRole("button", { name: "Voltar" }).click();

    // Confirmação destrutiva: o aviso vem antes de o diálogo abrir.
    const row = page.locator("article").filter({ hasText: charge });
    await row.getByRole("button", { exact: true, name: charge }).click();
    await row.getByRole("button", { exact: true, name: "Excluir" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(notice)).toBeVisible();

    // Busca é só navegação: continua funcionando.
    await page.getByRole("searchbox", { name: "Buscar cobranças" }).fill("Banner");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/\/cobrancas\?q=Banner/);
    await expect(page.locator("article.record-row")).toHaveCount(1);
    await expect(row).toBeVisible();
  });

  test("o servidor recusa a ação mesmo quando o navegador é contornado", async ({ page }) => {
    await page.goto("/clientes/novo");
    await page.getByLabel("Nome", { exact: true }).fill("Cliente do visitante");
    // `form.submit()` não dispara o evento que o guarda do navegador intercepta: o
    // formulário vai direto ao servidor, como faria alguém sem JavaScript.
    await page
      .locator("form")
      .filter({ has: page.getByLabel("Nome", { exact: true }) })
      .evaluate((form: HTMLFormElement) => form.submit());

    await expect(page).toHaveURL(/\/login\?status=guest$/, { timeout: 15_000 });
    await expect(page.getByText(notice)).toBeVisible();

    await page.goto("/clientes");
    await expect(page.getByText("Cliente do visitante")).toHaveCount(0);
  });

  test("sai do modo visitante e volta a exigir login", async ({ page }) => {
    await page.getByRole("button", { name: "Abrir menu do perfil" }).click();
    await page.getByRole("button", { name: "Sair do modo visitante" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=/);
    // O cadastro de verdade continua fora do alcance do visitante.
    await page.getByRole("button", { name: "Explorar como visitante" }).click();
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
