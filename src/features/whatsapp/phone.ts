/**
 * Converte o telefone cadastrado no formato que a Meta espera: só dígitos, com DDI.
 * Números brasileiros com DDD (10 ou 11 dígitos) ganham o 55. Qualquer outra coisa que não
 * tenha entre 12 e 15 dígitos é recusada, para não enviar a cobrança para o número errado.
 */
export function normalizeWhatsAppPhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return null;
}

/** Exibe `5561999991234` como `+55 (61) 99999-1234`; outros países ficam só com `+`. */
export function formatWhatsAppPhone(value: string): string {
  const match = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(value);
  if (!match) return `+${value}`;
  return `+55 (${match[1]}) ${match[2]}-${match[3]}`;
}
