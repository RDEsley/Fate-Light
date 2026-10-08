/** Fusos oferecidos nas telas de conta. O banco valida o valor contra a lista do Postgres. */
export const timezoneOptions = [
  { label: "São Paulo", value: "America/Sao_Paulo" },
  { label: "Recife", value: "America/Recife" },
  { label: "Manaus", value: "America/Manaus" },
  { label: "Rio Branco", value: "America/Rio_Branco" },
  { label: "UTC", value: "UTC" },
];

export const defaultTimezone = "America/Sao_Paulo";

/**
 * Fuso do navegador, quando é um dos oferecidos. Devolve `null` fora do navegador ou
 * quando o fuso detectado não está na lista — aí vale o padrão.
 */
export function detectTimezone() {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezoneOptions.some((option) => option.value === detected) ? detected : null;
  } catch {
    return null;
  }
}
