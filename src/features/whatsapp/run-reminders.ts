import type { SendResult } from "./cloud-api";
import { normalizeWhatsAppPhone } from "./phone";
import type { ReminderMessage } from "./template";

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
};

export type ReminderRunSummary = { claimed: number; failed: number; sent: number };

/**
 * Uma execução do agendador: reserva os lembretes do dia, envia um por um e registra o
 * resultado. Um envio que falha não interrompe os demais; o banco tenta de novo mais tarde.
 */
export async function runReminders(deps: ReminderRunDependencies): Promise<ReminderRunSummary> {
  const reminders = await deps.claim();
  const summary: ReminderRunSummary = { claimed: reminders.length, failed: 0, sent: 0 };

  for (const reminder of reminders) {
    const phone = normalizeWhatsAppPhone(reminder.recipient_phone);
    if (!phone) {
      await deps.record(reminder.delivery_id, null, "Telefone do cliente inválido.");
      summary.failed += 1;
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
      summary.sent += 1;
    } else {
      await deps.record(reminder.delivery_id, null, result.error);
      summary.failed += 1;
    }
  }

  return summary;
}
