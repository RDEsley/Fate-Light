export const supportContact = {
  phoneDisplay: "(61) 9 9044-8973",
  phoneE164: "5561990448973",
  whatsappMessage:
    "Olá! Sou usuário do Fate Light e gostaria de suporte com a Fate Eight Tech.",
} as const;

export function buildSupportWhatsAppUrl(extraContext?: string) {
  const message = extraContext
    ? `${supportContact.whatsappMessage}\n\n${extraContext}`
    : supportContact.whatsappMessage;
  return `https://wa.me/${supportContact.phoneE164}?text=${encodeURIComponent(message)}`;
}
