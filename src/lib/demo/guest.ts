/**
 * Cookie que liga o modo visitante. Não é credencial: só troca a fonte das telas pelos
 * dados fictícios, e só vale enquanto não existe sessão real.
 */
export const guestCookieName = "fate-light-guest";
export const guestCookieValue = "1";
/** Quatro horas: sobra para explorar, sem deixar o modo ligado para sempre. */
export const guestCookieMaxAge = 60 * 60 * 4;

export const guestNoticeTitle = "Modo visitante";
export const guestNotice = "Faça cadastro ou login para usar o sistema.";
