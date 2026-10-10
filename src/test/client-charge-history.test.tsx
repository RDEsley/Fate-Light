import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  ClientChargeHistory,
  type ChargeHistoryEntry,
} from "@/app/clientes/[clientId]/client-charge-history";

const entry = (
  id: string,
  status: ChargeHistoryEntry["status"],
  year: string,
  revenue: number,
): ChargeHistoryEntry => ({
  id,
  node: <article data-testid="row">{id}</article>,
  revenue,
  status,
  year,
});

const entries = [
  entry("out-26", "pending", "2026", 800),
  entry("set-26", "paid", "2026", 800),
  entry("dez-25", "paid", "2025", 500),
  entry("nov-25", "cancelled", "2025", 500),
];

describe("client charge history", () => {
  const rows = () => screen.getAllByTestId("row").map((row) => row.textContent);
  const renderHistory = (hidden = 0) =>
    render(
      <ClientChargeHistory columns="1fr" entries={entries} head={["Cobrança"]} hidden={hidden} />,
    );

  it("mostra tudo com a contagem por situação e o total recebido", () => {
    renderHistory();

    expect(rows()).toEqual(["out-26", "set-26", "dez-25", "nov-25"]);
    const filters = within(screen.getByRole("group", { name: /situação/i }));
    expect(filters.getByRole("button", { name: /todas/i })).toHaveAttribute("aria-pressed", "true");
    expect(filters.getByRole("button", { name: /pagas/i })).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent(/4 cobranças.*recebido R\$\s1\.300,00/);
  });

  it("combina situação e ano e soma só o que foi pago no recorte", () => {
    renderHistory(12);

    fireEvent.click(screen.getByRole("button", { name: /pagas/i }));
    expect(rows()).toEqual(["set-26", "dez-25"]);

    fireEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(rows()).toEqual(["dez-25"]);
    expect(screen.getByRole("status")).toHaveTextContent(/1 cobrança neste recorte.*R\$\s500,00/);
    expect(screen.getByRole("status")).toHaveTextContent(/12 mais antigas não listadas/);
  });

  it("explica quando o recorte fica vazio", () => {
    renderHistory();

    fireEvent.click(screen.getByRole("button", { name: /pendentes/i }));
    fireEvent.click(screen.getByRole("button", { name: "2025" }));

    expect(screen.queryByTestId("row")).not.toBeInTheDocument();
    expect(screen.getByText(/nenhuma cobrança neste recorte/i)).toBeInTheDocument();
  });
});
