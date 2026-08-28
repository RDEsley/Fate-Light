import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

import { addDays, isoDateInTimeZone } from "@/features/mvp/format";

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
  const href = message.HTML.match(/href="([^"]*(?:token_hash|code=)[^"]*)"/i)?.[1];
  expect(href).toBeTruthy();
  return { href: href!.replaceAll("&amp;", "&"), messageId: selected!.ID };
}

function dateOffset(days: number) {
  const [year, month, day] = addDays(isoDateInTimeZone("America/Sao_Paulo"), days).split("-");
  return `${day}/${month}/${year}`;
}

async function fillDate(field: Locator, value: string) {
  await field.fill(value);
  await field.press("Escape");
}

async function waitForCaptcha(page: Page) {
  await expect(page.locator('input[name="captchaToken"]')).toHaveValue(/\S+/, {
    timeout: 15_000,
  });
}

async function selectClient(panel: Locator, name: string) {
  await panel.getByRole("combobox", { name: "Cliente", exact: true }).fill(name);
  await panel.getByRole("listbox").getByRole("option").filter({ hasText: name }).click();
}

async function selectField(panel: Locator, name: string, option: string) {
  const field = panel.locator(`input[name="${name}"]`).locator("..");
  await field.getByRole("combobox").click();
  await field.getByRole("option", { name: new RegExp(`^${option}\\b`) }).click();
}

async function addService(page: Page, values: { name: string; own: string; media: string }) {
  const panel = page.locator("details").filter({ hasText: "Adicionar serviço" });
  await panel.locator(":scope > summary").click();
  await panel.getByLabel("Nome exibido no cliente").fill(values.name);
  // O rótulo contém uma ajuda contextual acessível. O nome do campo é o contrato
  // estável do formulário e evita acoplar o fluxo E2E ao texto dessa explicação.
  await panel.locator('input[name="listPrice"]').fill(values.own);
  const firstDueDate = panel.getByLabel("Primeiro vencimento", { exact: true });
  await fillDate(firstDueDate, dateOffset(7));
  const mediaBudget = panel.locator('input[name="mediaBudget"]');
  await panel.getByText("Personalizar preço e agenda", { exact: true }).click();
  await expect(mediaBudget).toBeVisible();
  await fillDate(panel.getByLabel("Início do serviço", { exact: true }), dateOffset(0));
  await mediaBudget.fill(values.media);
  const submit = panel.getByRole("button", { name: "Aplicar serviço e criar cobrança" });
  await submit.click();
  if (Number(values.own) === 0) {
    await expect(panel.getByText("Vale conferir antes de continuar")).toBeVisible();
    await submit.click();
  }
  await expect(page.getByText("Serviço aplicado e cobrança criada.")).toBeVisible();
}

test.describe("authenticated MVP journey", () => {
  test.skip(!authE2eEnabled, "Requer Supabase local e Mailpit iniciados explicitamente.");
  test.describe.configure({ mode: "serial" });

  test("executa o fluxo diário completo da Fate Light", async ({ page, request }) => {
    test.setTimeout(240_000);
    const email = `mvp-${Date.now()}@example.test`;
    const password = "Mvp-Teste-2026!";
    await page.goto("/cadastro");
    await page.getByLabel("Nome ou nome da empresa").fill("Pessoa E2E");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel(/^Senha/).fill(password);
    await page.getByLabel("Confirmar senha").fill(password);
    await waitForCaptcha(page);
    await page.getByRole("button", { name: /^criar conta$/i }).click();
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await page.getByLabel("Nome completo").fill("Pessoa E2E");
    await page.getByLabel("Nome do workspace").fill("Fate Light E2E");
    await page.getByLabel("Razão social").fill("Fate Light E2E LTDA");
    for (const checkbox of await page.getByRole("checkbox", { name: /li e aceito/i }).all())
      await checkbox.check();
    await page.getByRole("button", { name: /criar workspace/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: /pular tutorial/i }).click();

    await page.getByRole("link", { name: "Novo cliente" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Cliente MVP");
    await page.getByLabel(/razão social ou nome fantasia/i).fill("Empresa Cliente MVP");
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
    await adsCard.getByRole("link", { exact: true, name: "Cobrança" }).click();
    let chargePanel = page.locator("details").filter({ hasText: "Cobrança avulsa" });
    await chargePanel.getByLabel("Descrição").fill("Mensalidade Ads");
    await fillDate(chargePanel.getByLabel("Vencimento", { exact: true }), dateOffset(0));
    await chargePanel.locator('input[name="companyRevenue"]').fill("500");
    await chargePanel.locator('input[name="mediaBudget"]').fill("1000");
    await chargePanel.getByRole("button", { name: "Criar cobrança" }).click();
    const paidCharge = page.locator("article").filter({ hasText: "Mensalidade Ads" });
    await selectField(paidCharge, "paymentMethod", "Pix");
    await paidCharge.getByRole("button", { name: "Marcar como paga" }).click();
    await expect(page.getByText(/pagamento registrado/i)).toBeVisible();

    chargePanel = page.locator("details").filter({ hasText: "Cobrança avulsa" });
    await chargePanel.locator("summary").click();
    await selectClient(chargePanel, "Cliente MVP");
    await chargePanel.getByLabel("Descrição").fill("Pendência operacional");
    await fillDate(chargePanel.getByLabel("Vencimento", { exact: true }), dateOffset(-1));
    await chargePanel.locator('input[name="companyRevenue"]').fill("100");
    await chargePanel.locator('input[name="mediaBudget"]').fill("0");
    await chargePanel.getByRole("button", { name: "Criar cobrança" }).click();
    await expect(
      page.locator("article").filter({ hasText: "Pendência operacional" }).getByText("Vencida"),
    ).toBeVisible();

    await page.getByRole("link", { name: "Despesas" }).click();
    const expensePanel = page.locator("details").filter({ hasText: "Nova despesa" });
    await expensePanel.locator("summary").click();
    await expensePanel.getByLabel("Descrição").fill("Ferramenta mensal");
    await expensePanel.getByLabel("Valor").fill("200");
    await fillDate(expensePanel.getByLabel("Vencimento ou data", { exact: true }), dateOffset(0));
    await selectField(expensePanel, "status", "Paga");
    await expensePanel.getByRole("button", { name: "Criar despesa" }).click();
    await expect(page.getByText("Ferramenta mensal")).toBeVisible();

    await page.getByRole("link", { name: "Domínios" }).click();
    const domainPanel = page.locator("details").filter({ hasText: "Novo domínio" });
    await domainPanel.locator(":scope > summary").click();
    await selectClient(domainPanel, "Cliente MVP");
    await domainPanel.getByLabel("Domínio").fill("cliente-mvp.example");
    await fillDate(domainPanel.getByLabel("Data de expiração", { exact: true }), dateOffset(7));
    await domainPanel.getByRole("button", { name: "Criar domínio" }).click();
    await expect(page.getByText("Vence em até 7 dias")).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.getByRole("link", { name: "Todo o período" }).click();
    await expect(page).toHaveURL(/\/dashboard\?period=all$/);
    await expect(page.getByRole("link", { name: /Receita própria recebida/ })).toContainText(
      /R\$\s*500,00/,
    );
    await expect(page.getByText("Verba e repasses", { exact: true }).locator("..")).toContainText(
      /R\$\s*3\.000,00/,
    );
    await expect(page.getByRole("link", { name: /Despesas pagas/ })).toContainText(/R\$\s*200,00/);
    await expect(page.getByRole("link", { name: /Resultado gerencial/ })).toContainText(
      /R\$\s*300,00/,
    );
    await expect(page.getByRole("heading", { name: "Cobranças vencidas (1)" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Domínios nos próximos 30 dias (1)" }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole("link", { name: "Abrir central de alertas" }).click();
    const overdueAlert = page.locator("article").filter({ hasText: "Pendência operacional" });
    await overdueAlert.getByRole("link", { name: "Abrir origem" }).click();
    await expect(page).toHaveURL(/\/cobrancas\?focus=/);
    await expect(
      page.locator("article").filter({ hasText: "Pendência operacional" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Abrir menu do perfil" }).click();
    await page.getByRole("link", { name: "Perfil e sistema" }).click();
    await page.getByRole("link", { name: "Histórico" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Histórico" })).toBeVisible();
    await expect(page.getByText(/pagamento|cobrança/i).first()).toBeVisible();

    await page.getByRole("link", { name: "Importar dados" }).click();
    const importedClient = "Cliente Importado " + Date.now();
    const csv = [
      "Tipo,Cliente,Empresa,Email,Telefone,Site,Status",
      [
        "cliente",
        importedClient,
        "Empresa Importada",
        "importado@example.test",
        "",
        "importado.example",
        "ativo",
      ].join(","),
    ].join("\r\n");
    await page.locator('input[type="file"]').setInputFiles({
      buffer: Buffer.from(csv, "utf8"),
      mimeType: "text/csv",
      name: "clientes-e2e.csv",
    });
    await page.getByRole("button", { name: "Gerar prévia" }).click();
    await expect(
      page.getByText("Planilha validada. Revise o resumo antes de confirmar."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirmar 1 registros" }).click();
    await expect(page.getByText("Importação concluída com sucesso.")).toBeVisible();
    await page.getByRole("link", { name: "Clientes" }).click();
    await page.getByPlaceholder("Buscar cliente...").fill(importedClient);
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByRole("link", { name: importedClient, exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Abrir menu do perfil" }).click();
    await page.getByRole("button", { name: "Sair" }).click();
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await waitForCaptcha(page);
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Abrir menu do perfil" }).click();
    await page.getByRole("button", { name: "Sair" }).click();
    await page.getByRole("link", { name: /entrar com magic link/i }).click();
    await expect(page).toHaveURL(/method=magic-link/);
    await page.getByLabel("E-mail").fill(email);
    await waitForCaptcha(page);
    await page.getByRole("button", { name: /receber link de acesso/i }).click();
    const login = await waitForMagicLink(request, email);
    await page.goto(login.href);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Abrir menu do perfil" }).click();
    await page.getByRole("button", { name: "Sair" }).click();
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/esqueci-senha$/);
    await page.getByLabel("E-mail").fill(email);
    await waitForCaptcha(page);
    await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
    await expect(page).toHaveURL(/\/esqueci-senha\?status=sent$/, { timeout: 15_000 });
    await expect(page.getByText(/enviaremos um link seguro/i)).toBeVisible();
    const recovery = await waitForMagicLink(request, email, new Set([login.messageId]));
    await page.goto(recovery.href);
    await expect(page).toHaveURL(/\/redefinir-senha/);
    const newPassword = "Mvp-Nova-Senha-2026!";
    await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirmar nova senha").fill(newPassword);
    await page.getByRole("button", { name: "Atualizar senha" }).click();
    await expect(page).toHaveURL(/\/login\?status=password-updated/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(newPassword);
    await waitForCaptcha(page);
    await page.getByRole("button", { name: /^entrar$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    for (const route of [
      "/dashboard",
      "/clientes",
      "/cobrancas",
      "/despesas",
      "/dominios",
      "/alertas",
      "/importar",
      "/perfil",
      "/configuracoes/empresa",
    ]) {
      await page.goto(route);
      const critical = (await new AxeBuilder({ page }).analyze()).violations.filter(
        ({ impact }) => impact === "critical",
      );
      expect(critical, "Violações críticas de acessibilidade em " + route).toEqual([]);
    }

    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ height: 900, width });
      for (const route of ["/dashboard", "/cobrancas", "/importar", "/perfil"]) {
        await page.goto(route);
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          )
          .toBe(true);
      }
    }
  });
});
