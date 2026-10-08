/**
 * Regras puras da antecedência de alertas. Fica fora de `attention.ts` porque aquele
 * módulo é `server-only` e estas funções também são usadas fora do servidor.
 */

/** Usado quando o workspace ainda não tem preferência salva. */
export const fallbackAlertOffsets = [1, 7, 15, 30];

/** Antecedências oferecidas prontas; qualquer outro valor entra como personalizado. */
export const presetAlertOffsets = [0, 1, 3, 7, 15, 30, 60];

/** Limites espelhados de `private.are_valid_alert_offsets` no banco. */
export const maxAlertOffsetDays = 365;
export const maxAlertOffsets = 10;

/**
 * Janela de antecedência efetiva do workspace. O maior offset escolhido define até onde
 * o radar enxerga: quem só quer ser avisado com 1 dia não deve ver o mês inteiro.
 */
export function alertHorizon(offsets: number[] | null | undefined) {
  const values = (offsets ?? []).filter((days) => Number.isFinite(days) && days >= 0);
  return Math.max(1, ...(values.length ? values : fallbackAlertOffsets));
}

/** "No dia", "1 dia", "45 dias": o rótulo de uma antecedência em qualquer tela. */
export function alertOffsetLabel(days: number) {
  if (days === 0) return "No dia";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

/**
 * Lê uma antecedência digitada. Só aceita dias inteiros dentro do limite do banco;
 * qualquer outra coisa devolve `null` para a tela explicar em vez de salvar um palpite.
 */
export function parseAlertOffset(raw: string) {
  const text = raw.trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const days = Number(text);
  return days <= maxAlertOffsetDays ? days : null;
}
