import { render, screen } from "@testing-library/react";

import { AlertList, type AlertItem } from "@/app/dashboard/alert-list";

const items: AlertItem[] = [
  {
    href: "/despesas?state=pending#expense-1",
    id: "1",
    meta: "R$ 120,00 · 12/09/2026",
    title: "Hospedagem — Padaria do Bairro",
  },
];

describe("painel de alertas do dashboard", () => {
  it("mostra o título, a contagem do resumo e leva ao registro", () => {
    render(
      <AlertList
        count={9}
        empty="Nenhuma despesa vence nos próximos 7 dias."
        href="/despesas?state=pending&due=next7"
        icon="wallet"
        items={items}
        title="Despesas nos próximos 7 dias"
        tone="warning"
      />,
    );

    expect(screen.getByRole("heading", { name: "Despesas nos próximos 7 dias" })).toBeVisible();
    // A contagem vem do resumo do banco e continua correta mesmo com a prévia limitada.
    expect(screen.getByText("9")).toBeVisible();
    expect(screen.getByRole("link", { name: /Hospedagem/ })).toHaveAttribute(
      "href",
      "/despesas?state=pending#expense-1",
    );
    expect(screen.getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/despesas?state=pending&due=next7",
    );
  });

  it("mostra o vazio compacto quando não há nada pendente", () => {
    render(
      <AlertList
        count={0}
        empty="Nenhuma cobrança vencida."
        href="/cobrancas?state=pending"
        items={[]}
        title="Cobranças vencidas"
        tone="danger"
      />,
    );

    expect(screen.getByText("Nenhuma cobrança vencida.")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
