/** Limite alinhado ao numeric(15,2) e aos schemas Zod do domínio. */
export const MONEY_MAX_CENTS = 999_999_999_999_999;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** Extrai apenas dígitos de uma string digitada ou colada. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Converte dígitos (centavos como string) em centavos inteiros, respeitando o teto. */
export function digitsToCents(digits: string): number | null {
  if (!digits) return null;
  const trimmed = digits.replace(/^0+(?=\d)/, "") || "0";
  if (trimmed.length > 15) return MONEY_MAX_CENTS;
  const cents = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(cents)) return null;
  return Math.min(cents, MONEY_MAX_CENTS);
}

/**
 * Interpreta entrada livre (digitação, colagem com R$, pontos e vírgulas) em centavos.
 * Quando há separador decimal explícito, trata a parte fracionária como centavos.
 * Sem separador, cada dígito desloca centavos no estilo de app bancário.
 */
export function parseMoneyInputToCents(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const hasDecimalSeparator = /[,.]/.test(cleaned);
  if (!hasDecimalSeparator) {
    return digitsToCents(digitsOnly(cleaned));
  }

  // Remove símbolo e espaços; mantém o último separador como decimal.
  const withoutCurrency = cleaned.replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const lastComma = withoutCurrency.lastIndexOf(",");
  const lastDot = withoutCurrency.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  const integerPart = digitsOnly(withoutCurrency.slice(0, decimalIndex));
  const fractionRaw = digitsOnly(withoutCurrency.slice(decimalIndex + 1)).slice(0, 2);
  const fractionPart = fractionRaw.padEnd(2, "0");
  const combined = `${integerPart || "0"}${fractionPart}`;
  return digitsToCents(combined);
}

export function centsToCanonical(cents: number | null): string {
  if (cents === null) return "";
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100)
    .toString()
    .padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function centsToDisplay(cents: number | null, { currency = true } = {}): string {
  if (cents === null) return "";
  const amount = cents / 100;
  return currency ? currencyFormatter.format(amount) : decimalFormatter.format(amount);
}

/** Converte valor persistido (number | "1234.56" | null) em centavos para a UI. */
export function persistedToCents(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.min(Math.round(value * 100), MONEY_MAX_CENTS);
  }
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    return parseMoneyInputToCents(value);
  }
  const [whole, fraction = ""] = normalized.replace("-", "").split(".");
  const cents = Number.parseInt(`${whole}${fraction.padEnd(2, "0").slice(0, 2)}`, 10);
  if (!Number.isFinite(cents)) return null;
  return Math.min(cents, MONEY_MAX_CENTS);
}

export function appendDigit(cents: number | null, digit: string): number | null {
  if (!/^\d$/.test(digit)) return cents;
  const current = cents === null ? "" : String(cents);
  return digitsToCents(`${current}${digit}`);
}

export function removeLastDigit(cents: number | null): number | null {
  if (cents === null) return null;
  const next = String(cents).slice(0, -1);
  return digitsToCents(next);
}
