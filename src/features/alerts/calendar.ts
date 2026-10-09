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
    "METHOD:PUBLISH",
  ];
  for (const entry of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}-${entry.date}@fatelight`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${entry.date.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${addDays(entry.date, 1).replaceAll("-", "")}`,
      `SUMMARY:${escapeText(entry.title)}`,
    );
    if (entry.description) lines.push(`DESCRIPTION:${escapeText(entry.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
