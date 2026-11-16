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

/**
 * Texto sugerido para cadastrar na Meta, um por momento do aviso. As cinco variáveis seguem a
 * ordem de `templateVariables`; mude o texto à vontade, mas mantenha as cinco chaves.
 */
export const suggestedTemplateBodies: Record<ReminderKind, string> = {
  before:
    "Olá, {{1}}! Passando para lembrar do pagamento referente a {{2}}. Valor: {{3}}. " +
    "Vencimento: {{4}}. PIX: {{5}}. Após o pagamento, envie o comprovante por aqui. " +
    "Obrigado pela parceria!",
  due:
    "Olá, {{1}}! Hoje é o dia do pagamento referente a {{2}}. Valor: {{3}}. " +
    "Vencimento: {{4}}. PIX: {{5}}. Após o pagamento, envie o comprovante por aqui. " +
    "Obrigado pela parceria!",
  overdue:
    "Olá, {{1}}! Identificamos que o pagamento referente a {{2}} (valor: {{3}}, vencimento: " +
    "{{4}}) ainda está em aberto. PIX: {{5}}. Se já pagou, envie o comprovante por aqui. " +
    "Qualquer dúvida, é só responder.",
};

/** Prévia do texto sugerido com dados de exemplo, como o cliente vai ler. */
export function previewReminderText(
  kind: ReminderKind,
  message: Omit<ReminderMessage, "recipientPhone" | "templateLanguage" | "templateName">,
) {
  const values = reminderBodyValues({
    ...message,
    templateLanguage: "pt_BR",
    templateName: "preview",
  });
  return suggestedTemplateBodies[kind].replace(
    /\{\{([1-5])\}\}/g,
    (_, index: string) => values[Number(index) - 1] ?? "",
  );
}
