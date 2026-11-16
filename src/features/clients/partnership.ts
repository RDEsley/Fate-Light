import {
  daysBetween,
  formatDatePtBr,
  isoDateInTimeZone,
  isoDateOfInstant,
} from "@/features/mvp/format";

export type Partnership = {
  /** Frase pronta para o card: "Parceria há 2 anos e 3 meses". */
  text: string;
  /** Dica do card: quando começou e por quê. */
  title: string;
};

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function civilParts(date: string) {
  const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
  return { day, month, year };
}

/**
 * A parceria começa no primeiro pagamento confirmado do cliente, não no cadastro nem no
 * primeiro serviço. Datas são comparadas como dias civis no fuso do workspace: `paid_at` é
 * um instante UTC, e um pagamento das 22h de Brasília cairia no dia seguinte se cortássemos
 * a string ISO.
 *
 * Devolve `null` enquanto o cliente não pagou nada.
 */
export function partnershipFrom(
  firstPaidAt: string | null | undefined,
  timeZone: string,
  today: string = isoDateInTimeZone(timeZone),
): Partnership | null {
  if (!firstPaidAt) return null;

  const since = isoDateOfInstant(firstPaidAt, timeZone);
  const start = civilParts(since);
  const end = civilParts(today);
  // O mês só conta quando o dia do mês já chegou: 15/01 → 14/02 ainda não fechou 1 mês.
  const months = Math.max(
    0,
    (end.year - start.year) * 12 + (end.month - start.month) - (end.day < start.day ? 1 : 0),
  );
  const title = `Parceria desde ${formatDatePtBr(since)}, data do primeiro pagamento`;

  if (months >= 1) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const duration =
      years === 0
        ? plural(months, "mês", "meses")
        : rest === 0
          ? plural(years, "ano", "anos")
          : `${plural(years, "ano", "anos")} e ${plural(rest, "mês", "meses")}`;
    return { text: `Parceria há ${duration}`, title };
  }

  const days = Math.max(0, daysBetween(since, today));
  if (days === 0) return { text: "Parceria começou hoje", title };
  return { text: `Parceria há ${plural(days, "dia", "dias")}`, title };
}
