import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isValidWebhookSignature,
  parseWebhookStatuses,
  sendTemplateMessage,
} from "@/features/whatsapp/cloud-api";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/features/whatsapp/phone";
import { runReminders, type ClaimedReminder } from "@/features/whatsapp/run-reminders";
import { parseClientWhatsAppForm, parseWhatsAppSettingsForm } from "@/features/whatsapp/schemas";
import {
  buildTemplateRequest,
  previewReminderText,
  reminderBodyValues,
} from "@/features/whatsapp/template";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const message = {
  amount: 1500.5,
  contactName: "Marina Souza",
  description: "Gestão de tráfego",
  dueDate: "2026-12-10",
  headerImageUrl: null,
  pixKey: "financeiro@example.test",
  recipientPhone: "5561999991234",
  templateLanguage: "pt_BR",
  templateName: "cobranca_hoje",
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("telefone do WhatsApp", () => {
  it("acrescenta o DDI do Brasil a números com DDD", () => {
    expect(normalizeWhatsAppPhone("(61) 99999-1234")).toBe("5561999991234");
    expect(normalizeWhatsAppPhone("61 3333-1234")).toBe("556133331234");
    expect(normalizeWhatsAppPhone("+55 61 99999-1234")).toBe("5561999991234");
  });

  it("recusa números curtos ou longos demais em vez de adivinhar", () => {
    expect(normalizeWhatsAppPhone("99999-1234")).toBeNull();
    expect(normalizeWhatsAppPhone("1234567890123456")).toBeNull();
    expect(normalizeWhatsAppPhone(null)).toBeNull();
  });

  it("formata para leitura", () => {
    expect(formatWhatsAppPhone("5561999991234")).toBe("+55 (61) 99999-1234");
    expect(formatWhatsAppPhone("14155550100")).toBe("+14155550100");
  });
});

describe("template da mensagem", () => {
  it("usa o primeiro nome, valor em reais, data PT-BR e chave PIX", () => {
    expect(reminderBodyValues(message)).toEqual([
      "Marina",
      "Gestão de tráfego",
      "R$ 1.500,50",
      "10/12/2026",
      "financeiro@example.test",
    ]);
  });

  it("nunca manda variável vazia nem com quebra de linha", () => {
    const values = reminderBodyValues({
      ...message,
      contactName: " ",
      description: "Site\nnovo",
      pixKey: null,
    });
    expect(values[0]).toBe("cliente");
    expect(values[1]).toBe("Site novo");
    expect(values[4]).toBe("consulte a empresa");
  });

  it("monta o corpo da Cloud API com imagem de cabeçalho opcional", () => {
    const withoutImage = buildTemplateRequest(message);
    expect(withoutImage.to).toBe("5561999991234");
    expect(withoutImage.template.components).toHaveLength(1);

    const withImage = buildTemplateRequest({
      ...message,
      headerImageUrl: "https://example.test/cobranca.png",
    });
    expect(withImage.template.components[0]).toEqual({
      parameters: [{ image: { link: "https://example.test/cobranca.png" }, type: "image" }],
      type: "header",
    });
    expect(withImage.template.language).toEqual({ code: "pt_BR" });
  });

  it("gera a prévia mostrada na configuração", () => {
    expect(previewReminderText(message)).toContain("Olá, Marina!");
    expect(previewReminderText(message)).toContain("PIX: financeiro@example.test");
  });
});

describe("envio pela Cloud API", () => {
  it("devolve o id da mensagem aceita", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ messages: [{ id: "wamid.1" }] }, { status: 200 }),
    );
    const result = await sendTemplateMessage(
      { accessToken: "token", message, phoneNumberId: "123456" },
      fetchImpl,
    );
    expect(result).toEqual({ messageId: "wamid.1", ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://graph.facebook.com/v23.0/123456/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("transforma erro da Meta e falha de rede em resultado", async () => {
    const rejected = await sendTemplateMessage(
      { accessToken: "token", message, phoneNumberId: "123456" },
      async () =>
        Response.json({ error: { code: 132001, message: "Template não existe" } }, { status: 400 }),
    );
    expect(rejected).toEqual({ error: "Meta 132001: Template não existe", ok: false });

    const generic = await sendTemplateMessage(
      { accessToken: "token", message, phoneNumberId: "123456" },
      async () => new Response("oops", { status: 500 }),
    );
    expect(generic).toEqual({ error: "Meta respondeu 500.", ok: false });

    const offline = await sendTemplateMessage(
      { accessToken: "token", message, phoneNumberId: "123456" },
      async () => {
        throw new Error("offline");
      },
    );
    expect(offline).toEqual({ error: "Falha de conexão com a Meta.", ok: false });
  });
});

describe("webhook", () => {
  const secret = "app-secret-de-teste";
  const body = JSON.stringify({ entry: [] });
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("aceita somente a assinatura correta", () => {
    expect(isValidWebhookSignature(body, signature, secret)).toBe(true);
    expect(isValidWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(isValidWebhookSignature(body, "sha256=abc", secret)).toBe(false);
    expect(isValidWebhookSignature(body, null, secret)).toBe(false);
  });

  it("extrai status conhecidos e ignora o resto", () => {
    const statuses = parseWebhookStatuses({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: "wamid.1", status: "read" },
                  { errors: [{ title: "Número inválido" }], id: "wamid.2", status: "failed" },
                  { id: "wamid.3", status: "deleted" },
                  { status: "sent" },
                ],
              },
            },
            { value: { messages: [{ id: "x" }] } },
          ],
        },
        { changes: "inválido" },
      ],
    });
    expect(statuses).toEqual([
      { error: null, messageId: "wamid.1", status: "read" },
      { error: "Número inválido", messageId: "wamid.2", status: "failed" },
    ]);
    expect(parseWebhookStatuses(null)).toEqual([]);
  });
});

describe("execução do agendador", () => {
  const claimed = (overrides: Partial<ClaimedReminder>): ClaimedReminder => ({
    access_token: "token",
    amount: 150,
    contact_name: "Marina",
    delivery_id: "d1",
    description: "Hospedagem",
    due_date: "2026-12-10",
    header_image_url: null,
    phone_number_id: "123456",
    pix_key: null,
    recipient_phone: "61999991234",
    template_language: "pt_BR",
    template_name: "cobranca_hoje",
    ...overrides,
  });

  it("envia cada lembrete e registra sucesso, falha e telefone inválido", async () => {
    const record = vi.fn(async () => {});
    const wait = vi.fn(async () => {});
    const send = vi
      .fn()
      .mockResolvedValueOnce({ messageId: "wamid.ok", ok: true })
      .mockResolvedValueOnce({ error: "Meta 131026: sem WhatsApp", ok: false });
    const claim = vi
      .fn()
      .mockResolvedValueOnce([
        claimed({ delivery_id: "d1" }),
        claimed({ delivery_id: "d2" }),
        claimed({ delivery_id: "d3", recipient_phone: "123" }),
      ])
      .mockResolvedValueOnce([]);

    const summary = await runReminders({ claim, record, send, wait });

    expect(summary).toEqual({ claimed: 3, failed: 2, sent: 1 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(claim).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1_000);
    expect(send.mock.calls[0]?.[0].message.recipientPhone).toBe("5561999991234");
    expect(record).toHaveBeenCalledWith("d1", "wamid.ok", null);
    expect(record).toHaveBeenCalledWith("d2", null, "Meta 131026: sem WhatsApp");
    expect(record).toHaveBeenCalledWith("d3", null, "Telefone do cliente inválido.");
  });

  it("repete uma falha persistida até a terceira tentativa na mesma execução", async () => {
    const reminder = claimed({ delivery_id: "retry-1" });
    const claim = vi
      .fn()
      .mockResolvedValueOnce([reminder])
      .mockResolvedValueOnce([reminder])
      .mockResolvedValueOnce([reminder]);
    const record = vi.fn(async () => {});
    const send = vi
      .fn()
      .mockResolvedValueOnce({ error: "Meta respondeu 503.", ok: false })
      .mockResolvedValueOnce({ error: "Meta respondeu 503.", ok: false })
      .mockResolvedValueOnce({ messageId: "wamid.recovered", ok: true });
    const wait = vi.fn(async () => {});

    const summary = await runReminders({ claim, record, send, wait });

    expect(summary).toEqual({ claimed: 1, failed: 0, sent: 1 });
    expect(claim).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(3);
    expect(record).toHaveBeenNthCalledWith(1, "retry-1", null, "Meta respondeu 503.");
    expect(record).toHaveBeenNthCalledWith(2, "retry-1", null, "Meta respondeu 503.");
    expect(record).toHaveBeenNthCalledWith(3, "retry-1", "wamid.recovered", null);
    expect(wait.mock.calls).toEqual([[1_000], [2_000]]);
  });

  it("não ultrapassa três tentativas quando o envio continua falhando", async () => {
    const reminder = claimed({ delivery_id: "retry-2" });
    const claim = vi
      .fn()
      .mockResolvedValueOnce([reminder])
      .mockResolvedValueOnce([reminder])
      .mockResolvedValueOnce([reminder]);
    const record = vi.fn(async () => {});
    const send = vi.fn().mockResolvedValue({ error: "Meta respondeu 503.", ok: false });
    const wait = vi.fn(async () => {});

    const summary = await runReminders({ claim, record, send, wait });

    expect(summary).toEqual({ claimed: 1, failed: 1, sent: 0 });
    expect(claim).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(3);
    expect(record).toHaveBeenCalledTimes(3);
  });
});

describe("formulários", () => {
  const settings = {
    accessToken: "",
    daysAfter: "2",
    daysBefore: "3",
    enabled: "on",
    headerImageUrl: "",
    phoneNumberId: "1234567890",
    pixKey: "financeiro@example.test",
    templateBefore: "lembrete_antes",
    templateDue: "cobranca_hoje",
    templateLanguage: "pt_BR",
    templateOverdue: "",
  };

  it("lê a configuração com campos vazios como nulos", () => {
    const parsed = parseWhatsAppSettingsForm(form(settings));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toMatchObject({
      daysBefore: 3,
      enabled: true,
      headerImageUrl: null,
      removeToken: false,
      templateOverdue: null,
    });
  });

  it("recusa template com maiúsculas, imagem sem https e token curto", () => {
    const parsed = parseWhatsAppSettingsForm(
      form({
        ...settings,
        accessToken: "curto",
        headerImageUrl: "http://example.test/a.png",
        templateDue: "Cobranca",
      }),
    );
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fields = parsed.error.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["accessToken", "headerImageUrl", "templateDue"]),
    );
  });

  it("normaliza o WhatsApp do cliente e recusa número inválido", () => {
    expect(
      parseClientWhatsAppForm(
        form({ contactName: "Marina", enabled: "on", phone: "(61) 99999-1234" }),
      ),
    ).toEqual({
      data: { contactName: "Marina", enabled: true, phone: "5561999991234" },
      success: true,
    });
    expect(parseClientWhatsAppForm(form({ phone: "1234" }))).toEqual({
      field: "phone",
      success: false,
    });
    expect(parseClientWhatsAppForm(form({ contactName: "M" }))).toEqual({
      field: "contactName",
      success: false,
    });
  });
});

describe("cliente privilegiado", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não existe sem a chave secreta", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(createAdminSupabaseClient()).toBeNull();
  });

  it("é criado com a chave secreta, sem sessão", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "server_test_value_for_admin_client");
    expect(createAdminSupabaseClient()).not.toBeNull();
  });
});
