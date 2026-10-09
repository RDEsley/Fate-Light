import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Route } from "next";
import { vi } from "vitest";

vi.mock("@/app/alertas/actions", () => ({
  resolveManualAlert: vi.fn(),
  snoozeManualAlert: vi.fn(),
}));

import { AlertBoard } from "@/app/alertas/alert-board";
import type { AttentionItem } from "@/features/alerts/attention";
import {
  alertBucket,
  alertDeadline,
  googleCalendarUrl,
  nextAlertDate,
  parseAlertRecurrence,
  toAlertRows,
} from "@/features/alerts/board";

const today = "2026-10-08";

const item = (values: Partial<AttentionItem> & Pick<AttentionItem, "date" | "id">) =>
  ({
    href: "/cobrancas" as Route,
    meta: "",
    severity: "warning",
    source: "charge",
    subject: values.id,
    title: values.id,
    ...values,
  }) satisfies AttentionItem;

const items: AttentionItem[] = [
  item({ date: "2026-10-20", id: "charge-later", owner: "Padaria", subject: "Manutenção de site" }),
  item({ date: "2026-10-11", id: "expense-week", source: "expense", subject: "Hospedagem" }),
  item({
    date: "2026-10-04",
    href: "/cobrancas?focus=1" as Route,
    id: "charge-overdue",
    owner: "Loja Verde Folha",
    subject: "Site institucional",
  }),
  item({
    date: "2026-10-07",
    id: "manual-11111111-1111-4111-8111-111111111111",
    notes: "Consolidar os resultados do trimestre.",
    severity: "danger",
    source: "manual",
    subject: "Enviar relatório",
  }),
  item({ date: "2026-10-08", id: "domain-today", source: "domain", subject: "exemplo.com.br" }),
];

describe("alert board rules", () => {
  it("separa atraso, esta semana e mais adiante sem sobreposição", () => {
    expect(alertBucket("2026-10-07", today)).toBe("overdue");
    expect(alertBucket(today, today)).toBe("week");
    expect(alertBucket("2026-10-15", today)).toBe("week");
    expect(alertBucket("2026-10-16", today)).toBe("later");
  });

  it("descreve o prazo em linguagem de calendário", () => {
    expect(alertDeadline("2026-10-07", today)).toEqual({ label: "Há 1 dia", tone: "danger" });
    expect(alertDeadline("2026-09-29", today)).toEqual({ label: "Há 9 dias", tone: "danger" });
    expect(alertDeadline(today, today)).toEqual({ label: "Hoje", tone: "danger" });
    expect(alertDeadline("2026-10-09", today)).toEqual({ label: "Amanhã", tone: "warning" });
    expect(alertDeadline("2026-10-13", today)).toEqual({ label: "Em 5 dias", tone: "warning" });
    expect(alertDeadline("2026-10-29", today)).toEqual({ label: "Em 21 dias", tone: "neutral" });
  });

  it("ordena pelo que resolver primeiro e reconhece o lembrete urgente", () => {
    const rows = toAlertRows(items, today);

    expect(rows.map((row) => row.id)).toEqual([
      "charge-overdue",
      "manual-11111111-1111-4111-8111-111111111111",
      "domain-today",
      "expense-week",
      "charge-later",
    ]);
    expect(rows[1]).toMatchObject({
      bucket: "overdue",
      manualId: "11111111-1111-4111-8111-111111111111",
      urgent: true,
    });
    expect(rows[0]).toMatchObject({
      manualId: undefined,
      owner: "Loja Verde Folha",
      urgent: false,
    });
  });

  it("calcula a próxima ocorrência a partir da data original e nunca no passado", () => {
    expect(nextAlertDate("2026-10-05", "none", today)).toBeNull();
    expect(nextAlertDate("2026-10-08", "weekly", today)).toBe("2026-10-15");
    expect(nextAlertDate("2026-10-05", "monthly", today)).toBe("2026-11-05");
    expect(nextAlertDate("2026-10-05", "annual", today)).toBe("2027-10-05");
    // Resolvido com atraso: pula as ocorrências que já passaram.
    expect(nextAlertDate("2026-09-01", "weekly", today)).toBe("2026-10-13");
    expect(nextAlertDate("2026-07-31", "monthly", today)).toBe("2026-10-31");
    // "Todo dia 31" continua no dia 31 depois de passar por um mês curto.
    expect(nextAlertDate("2026-01-31", "monthly", "2026-02-10")).toBe("2026-02-28");
    expect(nextAlertDate("2026-01-31", "monthly", "2026-03-01")).toBe("2026-03-31");
  });

  it("trata repetição desconhecida como lembrete que não se repete", () => {
    expect(parseAlertRecurrence("monthly")).toBe("monthly");
    expect(parseAlertRecurrence("daily")).toBe("none");
    expect(parseAlertRecurrence(undefined)).toBe("none");
  });

  it("monta o evento de dia inteiro do Google Agenda", () => {
    const url = new URL(googleCalendarUrl("Renovar domínio", "Cliente X", "2026-12-31"));

    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("dates")).toBe("20261231/20270101");
    expect(url.searchParams.get("text")).toBe("Renovar domínio");
  });
});

describe("AlertBoard", () => {
  const renderBoard = () => render(<AlertBoard rows={toAlertRows(items, today)} total={7} />);
  const card = (name: RegExp) => screen.getByRole("button", { name });
  const titles = () =>
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

  it("mostra tudo agrupado por prazo, com o total aberto selecionado", () => {
    renderBoard();

    expect(card(/total aberto/i)).toHaveAttribute("aria-pressed", "true");
    expect(card(/total aberto/i)).toHaveTextContent("7");
    expect(card(/atrasados/i)).toHaveTextContent("2");
    expect(card(/esta semana/i)).toHaveTextContent("2");
    expect(card(/próximos/i)).toHaveTextContent("1");
    expect(titles()).toHaveLength(5);
    for (const group of ["Atrasados", "Esta semana", "Mais adiante"]) {
      expect(screen.getByText(group, { selector: ".record-list__group" })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /limpar filtro/i })).not.toBeInTheDocument();
  });

  it("filtra pelo cartão clicado, marca a seleção e limpa com um clique", () => {
    renderBoard();

    fireEvent.click(card(/atrasados/i));

    expect(card(/atrasados/i)).toHaveAttribute("aria-pressed", "true");
    expect(card(/total aberto/i)).toHaveAttribute("aria-pressed", "false");
    expect(titles()).toEqual(["Site institucional", "Enviar relatório"]);
    expect(screen.getByRole("status")).toHaveTextContent("2 de 5 alertas");

    fireEvent.click(screen.getByRole("button", { name: /limpar filtro/i }));
    expect(titles()).toHaveLength(5);
    expect(card(/total aberto/i)).toHaveAttribute("aria-pressed", "true");

    // Clicar de novo no cartão ativo também solta o filtro.
    fireEvent.click(card(/esta semana/i));
    expect(titles()).toEqual(["exemplo.com.br", "Hospedagem"]);
    fireEvent.click(card(/esta semana/i));
    expect(titles()).toHaveLength(5);
  });

  it("combina prazo e tipo e oferece saída quando nada corresponde", () => {
    renderBoard();
    const types = within(screen.getByRole("group", { name: /por tipo/i }));

    fireEvent.click(types.getByRole("button", { name: /cobranças/i }));
    expect(titles()).toEqual(["Site institucional", "Manutenção de site"]);

    fireEvent.click(card(/esta semana/i));
    expect(screen.getByText(/nenhum alerta neste filtro/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /limpar filtro/i })[0]!);
    expect(titles()).toHaveLength(5);
  });

  it("leva à origem nos alertas derivados e resolve ou adia os lembretes", () => {
    renderBoard();

    expect(
      screen.getByRole("link", { name: "Abrir cobrança: Site institucional" }),
    ).toHaveAttribute("href", "/cobrancas?focus=1");

    const reminder = screen.getByRole("button", { name: "Enviar relatório" });
    expect(screen.getByRole("button", { name: "Resolver" })).toBeInTheDocument();
    expect(screen.getByText(/urgente · consolidar os resultados/i)).toBeInTheDocument();

    fireEvent.click(reminder);
    expect(reminder).toHaveAttribute("aria-expanded", "true");
    for (const label of ["Adiar para amanhã", "Adiar 7 dias", "Adiar 30 dias"]) {
      const form = screen.getByRole("button", { name: label }).closest("form")!;
      expect(form.querySelector('input[name="id"]')).toHaveValue(
        "11111111-1111-4111-8111-111111111111",
      );
    }
    expect(screen.getByRole("link", { name: /google agenda/i })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("mostra o cliente e a repetição do lembrete e leva à ficha dele", () => {
    const linked = item({
      clientId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      date: "2026-10-12",
      id: "manual-22222222-2222-4222-8222-222222222222",
      owner: "Padaria Pão Dourado",
      recurrence: "monthly",
      source: "manual",
      subject: "Enviar relatório mensal",
    });
    render(<AlertBoard rows={toAlertRows([linked], today)} total={1} />);

    expect(screen.getByText("Padaria Pão Dourado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar relatório mensal" }));

    expect(screen.getByText("Repetição")).toBeInTheDocument();
    expect(screen.getByText("Todo mês")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir cliente" })).toHaveAttribute(
      "href",
      "/clientes/cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
  });

  it("não oferece repetição nem ficha do cliente onde elas não existem", () => {
    renderBoard();

    fireEvent.click(screen.getByRole("button", { name: "Enviar relatório" }));
    expect(screen.queryByText("Repetição")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir cliente" })).not.toBeInTheDocument();
  });
});
