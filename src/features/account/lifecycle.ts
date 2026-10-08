/**
 * Frases de confirmação das operações irreversíveis da conta. Vivem fora dos módulos
 * `"use server"` porque a tela precisa mostrá-las e o servidor precisa conferi-las.
 */

/** Pedido de exclusão da conta e de todos os dados do usuário. */
export const accountDeletionPhrase = "EXCLUIR TODOS OS MEUS DADOS";

/** Limpeza dos dados operacionais do workspace; a RPC exige a mesma frase. */
export const workspaceResetPhrase = "EXCLUIR TUDO";
