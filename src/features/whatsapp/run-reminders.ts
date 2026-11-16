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
 * Reserva e envia os lembretes do dia. Falhas persistidas são reclamadas novamente na mesma
 * execução, respeitando o limite de três tentativas da função SQL e pequenas pausas entre elas.
 */
export async function runReminders(deps: ReminderRunDependencies): Promise<ReminderRunSummary> {
  const outcomes = new Map<string, boolean>();
  let reminders = await deps.claim();

  for (let attempt = 0; attempt < MAX_ATTEMPTS && reminders.length > 0; attempt += 1) {
    let failedThisAttempt = false;

    for (const reminder of reminders) {
      outcomes.set(reminder.delivery_id, false);
      const phone = normalizeWhatsAppPhone(reminder.recipient_phone);
      if (!phone) {
        await deps.record(reminder.delivery_id, null, "Telefone do cliente inválido.");
        failedThisAttempt = true;
        continue;
      }

      const result = await deps.send({
        accessToken: reminder.access_token,
        message: {
          amount: reminder.amount,
          contactName: reminder.contact_name,
          description: reminder.description,
          dueDate: reminder.due_date,
          headerImageUrl: reminder.header_image_url,
          pixKey: reminder.pix_key,
          recipientPhone: phone,
          templateLanguage: reminder.template_language,
          templateName: reminder.template_name,
        },
        phoneNumberId: reminder.phone_number_id,
      });

      if (result.ok) {
        await deps.record(reminder.delivery_id, result.messageId, null);
        outcomes.set(reminder.delivery_id, true);
      } else {
        await deps.record(reminder.delivery_id, null, result.error);
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
