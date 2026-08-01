import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const authE2eEnabled = process.env.AUTH_E2E_ENABLED === "true";
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessage = { ID: string; To: { Address: string }[] };

async function waitForMagicLink(
  request: APIRequestContext,
  email: string,
  excluded = new Set<string>(),
) {
  let selected: MailpitMessage | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpitUrl}/api/v1/messages?limit=50`);
        if (!response.ok()) return false;
        const payload = (await response.json()) as { messages: MailpitMessage[] };
        selected = payload.messages.find(
          (message) =>
            message.To.some((recipient) => recipient.Address === email) &&
            !excluded.has(message.ID),
        );
        return Boolean(selected);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  const response = await request.get(`${mailpitUrl}/api/v1/message/${selected!.ID}`);
  const message = (await response.json()) as { HTML: string };
  const href = message.HTML.match(/href="([^"]*token_hash[^"]*)"/i)?.[1];
  expect(href).toBeTruthy();
  return { href: href!.replaceAll("&amp;", "&"), messageId: selected!.ID };
}

function dateOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function addService(page: Page, values: { name: string; own: string; media: string }) {
  const panel = page.locator("details").filter({ hasText: "Adicionar serviço" });
  await panel.locator("summary").click();
  await panel.getByLabel("Serviço").fill(values.name);
  await panel.getByLabel("Receita própria").fill(values.own);
  await panel.getByLabel("Verba de mídia").fill(values.media);
  await panel.getByLabel("Próximo vencimento").fill(dateOffset(7));
  await panel.getByRole("button", { name: "Adicionar serviço" }).click();
  await expect(page.getByText("Serviço adicionado ao cliente.")).toBeVisible();
}

test.describe("authenticated MVP journey", () => {
  test.skip(!authE2eEnabled, "Requer Supabase local e Mailpit iniciados explicitamente.");
  test.describe.configure({ mode: "serial" });

  test("executa o fluxo diário completo da Fate Eight", async ({ page, request }) => {
    test.setTimeout(90_000);
    const email = `mvp-${Date.now()}@example.test`;
    const password = "Mvp-Teste-2026!";
    await page.goto("/cadastro");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel(/^Senha/).fill(password);
    await page.getByLabel("Confirmar senha").fill(password);
    await page.getByRole("button", { name: /^criar conta$/i }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByLabel("Nome completo").fill("Pessoa E2E");
    await page.getByLabel("Nome do workspace").fill("Fate Eight E2E");
    await page.getByLabel("Razão social").fill("Fate Eight E2E LTDA");
    for (const checkbox of await page.getByRole("checkbox", { name: /li e aceito/i }).all())
      await checkbox.check();
    await page.getByRole("button", { name: /criar workspace/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Novo cliente" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Cliente MVP");
    await page.getByLabel(/empresa opcional/i).fill("Empresa Cliente MVP");
    await page.getByLabel(/e-mail opcional/i).fill("cliente-mvp@example.test");
    await page.getByLabel(/telefone opcional/i).fill("81999999999");
    await page.getByRole("button", { name: "Criar cliente" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cliente MVP" })).toBeVisible();

    await addService(page, { name: "Gestão de Google Ads", own: "500", media: "1000" });
    await addService(page, { name: "Landing Page", own: "0", media: "0" });
    await expect(
      page.getByRole("heading", { level: 3, name: "Gestão de Google Ads" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Landing Page" })).toBeVisible();

    const adsCard = page.locator("article").filter({ hasText: "Gestão de Google Ads" });
    await adsCard.getByRole("link", { name: "Criar cobrança" }).click();
    let chargePanel = page.locator("details").filter({ hasText: "Nova cobrança" });
    await chargePanel.getByLabel("Descrição").fill("Mensalidade Ads");
    await chargePanel.getByLabel("Vencimento").fill(dateOffset(0));
    await chargePanel.getByLabel("Receita própria").fill("500");
    await chargePanel.getByLabel("Verba de mídia").fill("1000");
    await chargePanel.getByRole("button", { name: "Criar cobrança" }).click();
    const paidCharge = page.locator("article").filter({ hasText: "Mensalidade Ads" });
    await paidCharge.getByLabel("Forma de pagamento").selectOption({ label: "Pix" });
    await paidCharge.getByRole("button", { name: "Marcar como paga" }).click();
    await expect(page.getByText(/pagamento registrado/i)).toBeVisible();

    chargePanel = page.locator("details").filter({ hasText: "Nova cobrança" });
    await chargePanel.locator("summary").click();
    await chargePanel.locator('select[name="clientId"]').selectOption({ label: "Cliente MVP" });
    await chargePanel.getByLabel("Descrição").fill("Pendência operacional");
    await chargePanel.getByLabel("Vencimento").fill(dateOffset(-1));
    await chargePanel.getByLabel("Receita própria").fill("100");
    await chargePanel.getByLabel("Verba de mídia").fill("0");
    await chargePanel.getByRole("button", { name: "Criar cobrança" }).click();
    await expect(
      page.locator("article").filter({ hasText: "Pendência operacional" }).getByText("Vencido"),
    ).toBeVisible();

    await page.getByRole("link", { name: "Despesas" }).click();
    await page.locator("summary").filter({ hasText: "Nova despesa" }).click();
    await page.getByLabel("Descrição").fill("Ferramenta mensal");
    await page.getByLabel("Valor").fill("200");
    await page.getByLabel("Status").selectOption("paid");
    await page.getByRole("button", { name: "Criar despesa" }).click();
    await expect(page.getByText("Ferramenta mensal")).toBeVisible();

    await page.getByRole("link", { name: "Domínios" }).click();
    await page.locator("summary").filter({ hasText: "Novo domínio" }).click();
    await page.getByLabel("Cliente").selectOption({ label: "Cliente MVP" });
    await page.getByLabel("Domínio").fill("cliente-mvp.example");
    await page.getByLabel("Data de expiração").fill(dateOffset(7));
    await page.getByRole("button", { name: "Criar domínio" }).click();
    await expect(page.getByText("Vence em até 7 dias")).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByText("Receita própria recebida").locator("..")).toContainText(
      /R\$\s*500,00/,
    );
    await expect(page.getByText("Verba de mídia do mês").locator("..")).toContainText(
      /R\$\s*1\.000,00/,
    );
    await expect(page.getByText("Despesas pagas no mês").locator("..")).toContainText(
      /R\$\s*200,00/,
    );
    await expect(page.getByText("Resultado do mês").locator("..")).toContainText(/R\$\s*300,00/);
    await expect(page.getByRole("heading", { name: "Cobranças vencidas (1)" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Domínios nos próximos 30 dias (1)" }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole("button", { name: "Sair" }).click();
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Sair" }).click();
    await page.getByRole("link", { name: /entrar com magic link/i }).click();
    await expect(page).toHaveURL(/method=magic-link/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: /receber link de acesso/i }).click();
    const login = await waitForMagicLink(request, email);
    await page.goto(login.href);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
