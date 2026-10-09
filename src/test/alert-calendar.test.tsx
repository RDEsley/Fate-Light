import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { CalendarExport } from "@/app/alertas/calendar-export";
import { resetCalendarMarks } from "@/app/alertas/calendar-store";
import type { AlertRow } from "@/features/alerts/board";
import { buildCalendarFile, calendarKey } from "@/features/alerts/calendar";

const row = (id: string, date: string, bucket: AlertRow["bucket"]): AlertRow => ({
  bucket,
  calendarUrl: "https://calendar.google.com/calendar/render",
  clientId: null,
  date,
  deadline: { label: "Hoje", tone: "danger" },
  href: "/cobrancas",
  id,
  notes: null,
  owner: "Padaria",
  recurrence: "none",
  source: "charge",
  subject: `Alerta ${id}`,
  urgent: false,
});

const rows = [row("a", "2026-10-05", "overdue"), row("b", "2026-10-10", "week")];

describe("calendar file", () => {
  it("gera eventos de dia inteiro com identificador estável e texto escapado", () => {
    const file = buildCalendarFile(
      [
        {
          date: "2026-12-31",
          description: "Cliente; nota, com vírgula",
          id: "charge-1",
          title: "Renovar",
        },
      ],
      new Date("2026-10-09T12:00:00.000Z"),
    );

    expect(file).toContain("BEGIN:VCALENDAR\r\n");
    expect(file).toContain("UID:charge-1-2026-12-31@fatelight");
    expect(file).toContain("DTSTART;VALUE=DATE:20261231");
    expect(file).toContain("DTEND;VALUE=DATE:20270101");
    expect(file).toContain("DTSTAMP:20261009T120000Z");
    expect(file).toContain("DESCRIPTION:Cliente\\; nota\\, com vírgula");
    expect(file.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("trata a mesma data como já levada e uma data nova como pendente", () => {
    expect(calendarKey({ date: "2026-10-05", id: "a" })).toBe("a|2026-10-05");
    expect(calendarKey({ date: "2026-10-06", id: "a" })).not.toBe("a|2026-10-05");
  });
});

describe("CalendarExport", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCalendarMarks();
    URL.createObjectURL = vi.fn(() => "blob:teste");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("abre com todos os alertas novos marcados e permite escolher por faixa", () => {
    render(<CalendarExport rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar à agenda/i }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog)
        .getAllByRole("checkbox")
        .every((box) => (box as HTMLInputElement).checked),
    ).toBe(true);

    fireEvent.click(within(dialog).getByRole("button", { name: "Atrasados" }));
    expect(within(dialog).getByRole("button", { name: "Baixar 1 para a agenda" })).toBeEnabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Nenhum" }));
    expect(within(dialog).getByRole("button", { name: "Escolha um alerta" })).toBeDisabled();
  });

  it("baixa o arquivo, marca os alertas e não os seleciona de novo", () => {
    render(<CalendarExport rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar à agenda/i }));
    fireEvent.click(screen.getByRole("button", { name: "Atrasados" }));
    act(() => fireEvent.click(screen.getByRole("button", { name: "Baixar 1 para a agenda" })));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem("fate-light:calendar-alerts") ?? "[]")).toEqual([
      "a|2026-10-05",
    ]);

    fireEvent.click(screen.getByRole("button", { name: /adicionar à agenda/i }));
    const boxes = within(screen.getByRole("dialog")).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => box.checked)).toEqual([false, true]);
    expect(within(screen.getByRole("dialog")).getByText("Na agenda")).toBeInTheDocument();
  });
});
