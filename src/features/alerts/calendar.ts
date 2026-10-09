import { addDays } from "@/features/mvp/format";

export type CalendarEntry = {
  date: string;
  description?: string | null;
  id: string;
  title: string;
};

/** Chave do que já foi levado à agenda: mudar a data do alerta volta a contar como novo. */
export function calendarKey(entry: Pick<CalendarEntry, "date" | "id">) {
  return `${entry.id}|${entry.date}`;
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/**
 * A norma limita cada linha a 75 bytes; o excesso continua na linha seguinte, iniciada por
 * um espaço. Importadores mais rígidos, como o do Outlook, recusam o arquivo sem isso. O
 * corte é por byte, sem partir um caractere acentuado ao meio.
 */
function foldLine(line: string) {
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * Arquivo iCalendar com um evento de dia inteiro por alerta. O UID é estável por alerta e
 * data, então importar o mesmo arquivo de novo atualiza o evento em vez de duplicá-lo.
 */
export function buildCalendarFile(entries: CalendarEntry[], stamp = new Date()) {
  const dtstamp = `${stamp.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fate Light//Alertas//PT-BR",
    "CALSCALE:GREGORIAN",
  ];
  for (const entry of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}-${entry.date}@fatelight`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${entry.date.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${addDays(entry.date, 1).replaceAll("-", "")}`,
      `SUMMARY:${escapeText(entry.title)}`,
      // Lembrete de dia inteiro não ocupa a agenda como "ocupado".
      "TRANSP:TRANSPARENT",
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
    );
    if (entry.description) lines.push(`DESCRIPTION:${escapeText(entry.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
