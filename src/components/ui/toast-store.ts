export type ToastTone = "error" | "info" | "success" | "warning";

export type ToastEntry = {
  /** Avisos do mesmo grupo se substituem: só o mais recente fica na tela. */
  group?: string;
  id: number;
  message: string;
  title?: string;
  tone: ToastTone;
  /** Sobe quando o mesmo aviso chega de novo, para o cartão reiniciar tempo e animação. */
  version: number;
};

const maxVisible = 4;
const emptyToasts: ToastEntry[] = [];
const listeners = new Set<() => void>();

let entries: ToastEntry[] = emptyToasts;
let nextId = 1;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readToasts() {
  return entries;
}

export function readServerToasts() {
  return emptyToasts;
}

/**
 * Notificação disparada por código: validação de formulário, recusa do servidor ou o
 * resultado de uma ação. Repetir o mesmo aviso enquanto ele ainda está na tela reinicia
 * o cartão em vez de empilhar cópias — clicar duas vezes em "Salvar" não vira uma torre.
 * Com `group`, o aviso novo toma o lugar do anterior do mesmo grupo: o resultado da
 * última ação é o que importa, não a fila das anteriores.
 */
export function pushToast(toast: {
  group?: string;
  message: string;
  title?: string;
  tone?: ToastTone;
}) {
  const tone = toast.tone ?? "success";
  const repeated = entries.find((entry) => entry.tone === tone && entry.message === toast.message);
  if (repeated) {
    entries = entries.map((entry) =>
      entry === repeated
        ? { ...entry, group: toast.group, title: toast.title, version: entry.version + 1 }
        : entry,
    );
  } else {
    const kept = toast.group ? entries.filter((entry) => entry.group !== toast.group) : entries;
    entries = [
      ...kept,
      {
        group: toast.group,
        id: nextId++,
        message: toast.message,
        title: toast.title,
        tone,
        version: 0,
      },
    ].slice(-maxVisible);
  }
  emit();
}

export function dismissToast(id: number) {
  if (!entries.some((entry) => entry.id === id)) return;
  entries = entries.filter((entry) => entry.id !== id);
  emit();
}

/** Só para testes: o estado do módulo sobrevive entre casos do mesmo arquivo. */
export function clearToasts() {
  entries = emptyToasts;
  emit();
}
