import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.hoisted(() => vi.fn());
const adminClient = vi.hoisted(() => ({ value: true }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => (adminClient.value ? { rpc } : null),
}));

const sendTemplateMessage = vi.hoisted(() => vi.fn());

vi.mock("@/features/whatsapp/cloud-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/whatsapp/cloud-api")>();
  return { ...actual, sendTemplateMessage };
});

import { GET as runCron } from "@/app/api/cron/whatsapp-reminders/route";
import { GET as verifyWebhook, POST as receiveWebhook } from "@/app/api/webhooks/whatsapp/route";

const cronSecret = "cron_secret_value_for_tests";
const appSecret = "app_secret_value_for_tests";
const verifyToken = "verify_token_value_for_tests";

beforeEach(() => {
  rpc.mockReset();
  sendTemplateMessage.mockReset();
  adminClient.value = true;
  vi.stubEnv("CRON_SECRET", cronSecret);
  vi.stubEnv("WHATSAPP_APP_SECRET", appSecret);
  vi.stubEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", verifyToken);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rota do agendador", () => {
  it("recusa chamada sem o segredo do cron", async () => {
    const response = await runCron(
      new Request("https://example.invalid/api/cron/whatsapp-reminders"),
    );
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("responde 503 quando a automação não está configurada no deploy", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await runCron(
      new Request("https://example.invalid/api/cron/whatsapp-reminders"),
    );
    expect(response.status).toBe(503);
  });

  it("reserva os lembretes do dia e devolve o resumo", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    const response = await runCron(
      new Request("https://example.invalid/api/cron/whatsapp-reminders", {
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ claimed: 0, failed: 0, sent: 0 });
    expect(rpc).toHaveBeenCalledWith("claim_whatsapp_reminders", {});
  });

  it("devolve 500 se não conseguir persistir o resultado do envio", async () => {
    rpc.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === "claim_whatsapp_reminders") {
        return {
          data: [
            {
              access_token: "token",
              amount: 150,
              contact_name: "Marina",
              delivery_id: "delivery-1",
              description: "Hospedagem",
              due_date: "2026-12-10",
              header_image_url: null,
              phone_number_id: "123456",
              pix_key: null,
              recipient_phone: "5561999991234",
              template_language: "pt_BR",
              template_name: "cobranca_hoje",
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: "database unavailable" } };
    });
    sendTemplateMessage.mockResolvedValueOnce({ messageId: "wamid.1", ok: true });

    const response = await runCron(
      new Request("https://example.invalid/api/cron/whatsapp-reminders", {
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "run_failed" });
    expect(rpc).toHaveBeenCalledWith("record_whatsapp_send_result", {
      p_delivery_id: "delivery-1",
      p_wa_message_id: "wamid.1",
    });
  });

  it("devolve 500 sem detalhes quando o banco falha", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const response = await runCron(
      new Request("https://example.invalid/api/cron/whatsapp-reminders", {
        headers: { authorization: `Bearer ${cronSecret}` },
      }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "run_failed" });
  });
});

describe("webhook da Meta", () => {
  it("confirma a assinatura do webhook com o token de verificação", async () => {
    const ok = await verifyWebhook(
      new Request(
        `https://example.invalid/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=42`,
      ),
    );
    expect(await ok.text()).toBe("42");

    const denied = await verifyWebhook(
      new Request(
        "https://example.invalid/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=42",
      ),
    );
    expect(denied.status).toBe(403);
  });

  it("recusa corpo sem assinatura válida", async () => {
    const response = await receiveWebhook(
      new Request("https://example.invalid/api/webhooks/whatsapp", {
        body: "{}",
        headers: { "x-hub-signature-256": "sha256=errado" },
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("pede reenvio à Meta quando não consegue salvar um status", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "database unavailable" } });
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.2", status: "read" }] } }] }],
    });
    const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
    const response = await receiveWebhook(
      new Request("https://example.invalid/api/webhooks/whatsapp", {
        body,
        headers: { "x-hub-signature-256": signature },
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "status_update_failed" });
  });

  it("registra cada status recebido", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const body = JSON.stringify({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }] } }] }],
    });
    const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
    const response = await receiveWebhook(
      new Request("https://example.invalid/api/webhooks/whatsapp", {
        body,
        headers: { "x-hub-signature-256": signature },
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("record_whatsapp_status", {
      p_status: "delivered",
      p_wa_message_id: "wamid.1",
    });
  });
});
