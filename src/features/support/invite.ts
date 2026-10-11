// Convite de doação. Tudo fica só neste navegador: quem limpa os dados do site volta a ver o
// convite. O Fate Light continua sem saber se alguém doou.
const visitsKey = "fate-light:visits";
const visitCountedKey = "fate-light:visit-counted";
const inviteSeenKey = "fate-light:donation-invite-seen";
const cardHiddenKey = "fate-light:donation-card-hidden";

/** A janela abre sozinha a partir desta visita, uma única vez. */
export const inviteAfterVisits = 5;
/** Tempo em que os botões da janela ficam travados, para a pessoa ler antes de clicar. */
export const inviteLockMs = 2000;

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento o convite só não é lembrado.
  }
}

/** Conta uma visita por abertura do sistema (não por tela) e devolve o total. */
export function countVisit() {
  const visits = Number(read(visitsKey)) || 0;
  try {
    if (window.sessionStorage.getItem(visitCountedKey) !== null) return visits;
    window.sessionStorage.setItem(visitCountedKey, "1");
  } catch {
    return visits;
  }
  write(visitsKey, String(visits + 1));
  return visits + 1;
}

export const inviteSeen = () => read(inviteSeenKey) === "1";
export const markInviteSeen = () => write(inviteSeenKey, "1");
export const cardHidden = () => read(cardHiddenKey) === "1";
export const hideCard = () => write(cardHiddenKey, "1");

/** Quem já copiou o código Pix não precisa mais ser convidado. */
export function settleInvite() {
  markInviteSeen();
  hideCard();
}

/** Ao sair da conta o cartão do menu volta a aparecer no próximo acesso. */
export function restoreCard() {
  try {
    window.localStorage.removeItem(cardHiddenKey);
  } catch {
    // Sem armazenamento não há o que restaurar.
  }
}
