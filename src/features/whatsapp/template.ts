import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";

export type ReminderKind = "before" | "due" | "overdue";

export const reminderKindLabels: Record<ReminderKind, string> = {
  before: "Antes do vencimento",
  due: "No dia do vencimento",
  overdue: "Após o vencimento",
};

/**
 * Ordem das variáveis do corpo do template. Precisa bater com o template aprovado na Meta:
 * {{1}} nome, {{2}} serviço, {{3}} valor, {{4}} vencimento e {{5}} chave PIX.
 */
export const templateVariables = ["Nome do contato", "Serviço", "Valor", "Vencimento", "Chave PIX"];

export type ReminderMessage = {
  amount: number | string;
  contactName: string;
  description: string;
  dueDate: string;
  headerImageUrl: string | null;
  pixKey: string | null;
  recipientPhone: string;
  templateLanguage: string;
  templateName: string;
};

/**
 * A Meta recusa variáveis com quebra de linha, tabulação ou mais de quatro espaços seguidos,
 * e uma variável vazia derruba o envio inteiro.
 */
function templateText(value: string, fallback: string) {
  const clean = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, " ")
    .trim();
  return (clean || fallback).slice(0, 200);
}

export function reminderBodyValues(message: Omit<ReminderMessage, "recipientPhone">) {
  return [
    templateText(message.contactName.split(/\s+/)[0] ?? "", "cliente"),
    templateText(message.description, "serviço"),
    templateText(formatCurrency(message.amount).replace(/\u00a0/g, " "), "-"),
    formatDatePtBr(message.dueDate),
    templateText(message.pixKey ?? "", "consulte a empresa"),
  ];
}

/** Corpo da requisição de envio de template da WhatsApp Cloud API. */
export function buildTemplateRequest(message: ReminderMessage) {
  const components: Array<Record<string, unknown>> = [];

  if (message.headerImageUrl) {
    components.push({
      parameters: [{ image: { link: message.headerImageUrl }, type: "image" }],
      type: "header",
    });
  }

  components.push({
    parameters: reminderBodyValues(message).map((text) => ({ text, type: "text" })),
    type: "body",
  });

  return {
    messaging_product: "whatsapp",
    template: {
      components,
      language: { code: message.templateLanguage },
      name: message.templateName,
    },
    to: message.recipientPhone,
    type: "template",
  };
}

/** Prévia do texto, para a tela de configuração mostrar como o cliente vai ler. */
export function previewReminderText(
  message: Omit<ReminderMessage, "recipientPhone" | "templateLanguage" | "templateName">,
) {
  const [name, service, amount, dueDate, pix] = reminderBodyValues({
    ...message,
    templateLanguage: "pt_BR",
    templateName: "preview",
  });
  return [
    `Olá, ${name}! Hoje é o dia do pagamento referente a ${service}.`,
    `Valor: ${amount}`,
    `Vencimento: ${dueDate}`,
    `PIX: ${pix}`,
    "Após o pagamento, envie o comprovante por aqui. Obrigado pela parceria!",
  ].join("\n");
}
