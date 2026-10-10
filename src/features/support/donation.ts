import { buildPixCode } from "./pix";

// Doação voluntária ao desenvolvedor por Pix. A mesma configuração vale para todos os
// projetos do autor; só o `txid` muda, para identificar a origem no extrato.
export const donation = {
  pixKey: "35f6734f-2587-4139-8e9b-0ed7a4436a7a",
  /** Nome que a pessoa confere no app do banco antes de confirmar. */
  receiver: "Richard Esley Silva Oliveira",
  /** Nome dentro do código: o padrão aceita até 25 caracteres, sem acentos. */
  receiverName: "RICHARD ESLEY S OLIVEIRA",
  receiverCity: "BRASILIA",
  txid: "FATELIGHT",
  suggestedAmounts: [5, 10, 20],
  maxAmount: 5000,
} as const;

/**
 * Lê um valor digitado, em reais. Vírgula ou ponto valem como decimal ("15,50" ou "15.50");
 * separador de milhar é recusado, para "1.500" nunca virar um valor diferente do pretendido.
 * Doação não é regra financeira do sistema, por isso não usa os helpers de `numeric`.
 */
export function parseDonation(text: string) {
  const match = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const value = Number(`${match[1]}.${match[2] ?? "0"}`);
  return value > 0 && value <= donation.maxAmount ? value : null;
}

export function donationCode(amount: number | null) {
  return buildPixCode({
    key: donation.pixKey,
    receiverName: donation.receiverName,
    receiverCity: donation.receiverCity,
    txid: donation.txid,
    ...(amount === null ? {} : { amount }),
  });
}

export const formatDonation = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
