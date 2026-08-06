/**
 * Regras puras da antecedência de alertas. Fica fora de `attention.ts` porque aquele
 * módulo é `server-only` e estas funções também são usadas fora do servidor.
 */

/** Usado quando o workspace ainda não tem preferência salva. */
export const fallbackAlertOffsets = [30, 15, 7, 1];

/**
 * Janela de antecedência efetiva do workspace. O maior offset escolhido define até onde
 * o radar enxerga: quem só quer ser avisado com 1 dia não deve ver o mês inteiro.
 */
export function alertHorizon(offsets: number[] | null | undefined) {
  const values = (offsets ?? []).filter((days) => Number.isFinite(days) && days >= 0);
  return Math.max(1, ...(values.length ? values : fallbackAlertOffsets));
}
