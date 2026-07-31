import { expect, test, type APIRequestContext } from "@playwright/test";

const authE2eEnabled = process.env.AUTH_E2E_ENABLED === "true";
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessage = {
  ID: string;
  To: { Address: string }[];
};

async function waitForMagicLink(
  request: APIRequestContext,
  email: string,
  excludedMessageIds = new Set<string>(),
) {
  let selectedMessage: MailpitMessage | undefined;

  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpitUrl}/api/v1/messages?limit=50`);
        if (!response.ok()) return false;

        const payload = (await response.json()) as { messages: MailpitMessage[] };
        selectedMessage = payload.messages.find(
          (message) =>
            message.To.some((recipient) => recipient.Address === email) &&
            !excludedMessageIds.has(message.ID),
        );
        return Boolean(selectedMessage);
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  const response = await request.get(`${mailpitUrl}/api/v1/message/${selectedMessage!.ID}`);
  expect(response.ok()).toBe(true);
  const message = (await response.json()) as { HTML: string };
  const href = message.HTML.match(/href="([^"]*token_hash[^"]*)"/i)?.[1];

  expect(href).toBeTruthy();
  return { href: href!.replaceAll("&amp;", "&"), messageId: selectedMessage!.ID };
}

test.describe("authenticated account journey", () => {
  test.skip(!authE2eEnabled, "Requer Supabase local e Mailpit iniciados explicitamente.");
  test.describe.configure({ mode: "serial" });

  test("cadastro, onboarding, perfil, solicitações e novo login", async ({ page, request }) => {
    const email = `phase3b-${Date.now()}@example.test`;

    await page.goto("/cadastro");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: /criar minha conta/i }).click();
    await expect(page).toHaveURL(/\/cadastro\?status=sent/);

    const signupMessage = await waitForMagicLink(request, email);
    await page.goto(signupMessage.href);
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByLabel("Nome completo").fill("Pessoa E2E");
    await page.getByLabel("Nome do workspace").fill("Empresa E2E");
    await page.getByLabel("Razão social").fill("Empresa E2E LTDA");
    for (const acceptance of await page.getByRole("checkbox", { name: /li e aceito/i }).all()) {
      await acceptance.check();
    }
    await page.getByRole("button", { name: /criar workspace/i }).click();

    await expect(page).toHaveURL(/\/perfil\?status=workspace-created/);
    await expect(page.getByRole("heading", { level: 1, name: "Perfil" })).toBeVisible();
    await expect(page.getByLabel("E-mail confirmado")).toHaveValue(email);
    await expect(page.getByLabel("E-mail confirmado")).toBeDisabled();

    await page.getByRole("button", { name: /solicitar exportação/i }).click();
    await expect(page.getByText(/solicitação de exportação registrada/i)).toBeVisible();
    await expect(page.getByText("Exportação", { exact: true })).toBeVisible();

    await page.getByLabel(/digite excluir minha conta/i).fill("EXCLUIR MINHA CONTA");
    await page.getByRole("checkbox", { name: /registra o pedido/i }).check();
    await page.getByRole("button", { name: /solicitar exclusão/i }).click();
    await expect(page.getByText(/solicitação de exclusão registrada/i)).toBeVisible();
    await expect(page.getByText("Exclusão", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Clientes" }).click();
    await page.getByRole("link", { name: /novo cliente/i }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Cliente E2E");
    await page.getByLabel(/nome comercial opcional/i).fill("Marca E2E");
    await page.getByLabel(/responsável opcional/i).fill("Responsável E2E");
    await page.getByLabel(/tags separadas/i).fill("mensal, prioridade");
    await page.getByRole("button", { name: /criar cliente/i }).click();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+\?status=created/);
    await expect(page.getByRole("heading", { level: 1, name: "Cliente E2E" })).toBeVisible();
    await expect(page.getByText("Sem cobrança aberta", { exact: true })).toBeVisible();

    await page.locator("summary").filter({ hasText: "Adicionar contato" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Contato E2E");
    await page.getByLabel("E-mail", { exact: true }).fill("contato-e2e@example.test");
    await page.getByLabel(/função opcional/i).fill("Financeiro");
    await page.getByLabel("Contato principal").check();
    await page.getByRole("button", { name: /adicionar contato/i }).click();
    await expect(page.getByText(/contato adicionado/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Contato E2E" })).toBeVisible();

    let editContactPanel = page.locator("details").filter({ hasText: "Editar contato" });
    await editContactPanel.locator("summary").click();
    await editContactPanel.getByLabel(/função opcional/i).fill("Administrativo");
    await editContactPanel.getByRole("button", { name: /salvar contato/i }).click();
    await expect(page.getByText(/contato atualizado/i)).toBeVisible();
    await expect(page.getByText("Administrativo", { exact: true })).toBeVisible();

    editContactPanel = page.locator("details").filter({ hasText: "Editar contato" });
    await editContactPanel.locator("summary").click();
    await editContactPanel.getByRole("button", { name: /arquivar contato/i }).click();
    await expect(page.getByText(/contato arquivado/i)).toBeVisible();
    await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Editar", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Cliente E2E Atualizado");
    await page.getByRole("button", { name: /salvar cliente/i }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Cliente E2E Atualizado" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Arquivar", exact: true }).click();
    await expect(page).toHaveURL(/\/clientes\?status=archived/);
    await expect(page.getByText(/cliente arquivado sem apagar/i)).toBeVisible();
    await page.getByLabel("Exibição").selectOption("archived");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page.getByRole("link", { name: "Cliente E2E Atualizado" })).toBeVisible();
    await page.getByRole("button", { name: "Restaurar" }).click();
    await expect(page.getByText(/cliente restaurado como ativo/i)).toBeVisible();

    await page.getByRole("link", { name: /configurações da empresa/i }).click();
    await expect(page.getByLabel("Nome do workspace")).toHaveValue("Empresa E2E");
    await expect(page.getByLabel("Moeda")).toHaveValue("BRL");
    await expect(page.getByLabel("Moeda")).toBeDisabled();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login\?status=signed-out/);

    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: /receber link de acesso/i }).click();
    await expect(page).toHaveURL(/\/login\?status=sent/);

    const loginMessage = await waitForMagicLink(request, email, new Set([signupMessage.messageId]));
    await page.goto(loginMessage.href);
    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole("heading", { level: 1, name: "Perfil" })).toBeVisible();
  });
});
