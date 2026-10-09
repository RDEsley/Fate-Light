const storageKey = "fate-light:calendar-alerts";
const listeners = new Set<() => void>();
const empty: readonly string[] = [];
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : empty;
  } catch {
    cache = empty;
  }
  return cache;
}

export function subscribeCalendarMarks(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const readCalendarMarks = () => read();
export const readServerCalendarMarks = () => empty;

/**
 * Registra, neste navegador, os alertas já levados à agenda. É só um lembrete visual para
 * não repetir o trabalho: o Fate Light não lê a agenda de ninguém.
 */
export function markInCalendar(keys: string[]) {
  const next = [...new Set([...read(), ...keys])].slice(-500);
  cache = next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Sem armazenamento local a marca vale só até recarregar a página.
  }
  for (const listener of listeners) listener();
}

/** Só para testes. */
export function resetCalendarMarks() {
  cache = null;
}
