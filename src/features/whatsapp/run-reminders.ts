import type { SendResult } from "./cloud-api";
import { normalizeWhatsAppPhone } from "./phone";
import type { ReminderMessage } from "./template";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 2_000] as const;

export type ClaimedReminder = {
  access_token: string;
  amount: number;
  contact_name: string;
  delivery_id: string;
  description: string;
  due_date: string;
  header_image_url: string | null;
  phone_number_id: string;
  pix_key: string | null;
  recipient_phone: string;
  template_language: string;
  template_name: string;
};

export type ReminderRunDependencies = {
  claim: () => Promise<ClaimedReminder[]>;
  record: (deliveryId: string, messageId: string | null, error: string | null) => Promise<void>;
  send: (input: {
    accessToken: string;
    message: ReminderMessage;
    phoneNumberId: string;
  }) => Promise<SendResult>;
  wait?: (milliseconds: number) => Promise<void>;
};

export type ReminderRunSummary = { claimed: number; failed: number; sent: number };

function pause(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Cobranças do mesmo cliente que vencem no mesmo dia viram uma única mensagem: serviços
 * listados juntos e valor somado. Cada cobrança mantém a própria linha de histórico.
 */
function groupReminders(reminders: ClaimedReminder[]) {
  const groups = new Map<string, ClaimedReminder[]>();
  for (const reminder of reminders) {
    const key = [
      reminder.phone_number_id,
      reminder.template_name,
      reminder.recipient_phone,
      reminder.due_date,
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), reminder]);
  }
  return [...groups.values()];
}

function joinServices(descriptions: string[]) {
  const unique = [...new Set(descriptions.map((value) => value.trim()).filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} e ${unique[unique.length - 1]}`;
}

function sumAmounts(group: ClaimedReminder[]) {
  const cents = group.reduce((total, item) => total + Math.round(Number(item.amount) * 100), 0);
  return cents / 100;
}

/**
 * Reserva e envia os lembretes do dia. Falhas persistidas são reclamadas novamente na mesma
 * execução, respeitando o limite de três tentativas da função SQL e pequenas pausas entre elas.
 */
export async function runReminders(deps: ReminderRunDependencies): Promise<ReminderRunSummary> {
  const outcomes = new Map<string, boolean>();
  let reminders = await deps.claim();

  for (let attempt = 0; attempt < MAX_ATTEMPTS && reminders.length > 0; attempt += 1) {
    let failedThisAttempt = false;

    for (const group of groupReminders(reminders)) {
      const [leader] = group;
      if (!leader) continue;
      for (const item of group) outcomes.set(item.delivery_id, false);

      const phone = normalizeWhatsAppPhone(leader.recipient_phone);
      if (!phone) {
        for (const item of group) {
          await deps.record(item.delivery_id, null, "Telefone do cliente inválido.");
        }
        failedThisAttempt = true;
        continue;
      }

      const result = await deps.send({
        accessToken: leader.access_token,
        message: {
          amount: sumAmounts(group),
          contactName: leader.contact_name,
          description: joinServices(group.map((item) => item.description)),
          dueDate: leader.due_date,
          headerImageUrl: leader.header_image_url,
          pixKey: leader.pix_key,
          recipientPhone: phone,
          templateLanguage: leader.template_language,
          templateName: leader.template_name,
        },
        phoneNumberId: leader.phone_number_id,
      });

      if (result.ok) {
        // O id da Meta é único por linha: a primeira recebe o id real (e os status do
        // webhook); as demais do mesmo envio guardam uma variação rastreável.
        for (const [index, item] of group.entries()) {
          await deps.record(
            item.delivery_id,
            index === 0 ? result.messageId : `${result.messageId}#${index + 1}`,
            null,
          );
          outcomes.set(item.delivery_id, true);
        }
      } else {
        for (const item of group) await deps.record(item.delivery_id, null, result.error);
        failedThisAttempt = true;
      }
    }

    if (!failedThisAttempt || attempt === MAX_ATTEMPTS - 1) break;

    await (deps.wait ?? pause)(RETRY_DELAYS_MS[attempt]);
    reminders = await deps.claim();
  }

  const sent = [...outcomes.values()].filter(Boolean).length;
  return { claimed: outcomes.size, failed: outcomes.size - sent, sent };
}
