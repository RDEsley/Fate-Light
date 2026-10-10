"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { RecordList } from "@/components/ui/record-row";
import { formatCurrency } from "@/features/mvp/format";

export type ChargeHistoryEntry = {
  id: string;
  /** Linha já pronta, renderizada no servidor. */
  node: ReactNode;
  /** Receita própria da cobrança, para o total do filtro. */
  revenue: number;
  status: "cancelled" | "paid" | "pending";
  year: string;
};

const statusFilters = [
  ["all", "Todas"],
  ["paid", "Pagas"],
  ["pending", "Pendentes"],
  ["cancelled", "Canceladas"],
] as const;

type StatusFilter = (typeof statusFilters)[number][0];

/**
 * Tudo o que já foi cobrado deste cliente, na própria ficha. As linhas chegam prontas do
 * servidor; aqui só se escolhe o recorte — situação e ano — sem ir ao servidor de novo.
 */
export function ClientChargeHistory({
  columns,
  entries,
  head,
  hidden,
}: {
  columns: string;
  entries: ChargeHistoryEntry[];
  head: string[];
  /** Quantas cobranças mais antigas ficaram fora do limite carregado. */
  hidden: number;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [year, setYear] = useState("all");
  const years = [...new Set(entries.map((entry) => entry.year))].sort().reverse();
  const visible = entries.filter(
    (entry) =>
      (status === "all" || entry.status === status) && (year === "all" || entry.year === year),
  );
  const received = visible
    .filter((entry) => entry.status === "paid")
    .reduce((total, entry) => total + entry.revenue, 0);

  return (
    <>
      <div className="alert-toolbar">
        <div aria-label="Filtrar por situação" className="filter-pills" role="group">
          {statusFilters.map(([value, label]) => (
            <button
              aria-pressed={status === value}
              key={value}
              onClick={() => setStatus(value)}
              type="button"
            >
              {label}
              <span>
                {value === "all"
                  ? entries.length
                  : entries.filter((entry) => entry.status === value).length}
              </span>
            </button>
          ))}
        </div>
        {years.length > 1 ? (
          <div aria-label="Filtrar por ano" className="filter-pills" role="group">
            <button aria-pressed={year === "all"} onClick={() => setYear("all")} type="button">
              Todos os anos
            </button>
            {years.map((value) => (
              <button
                aria-pressed={year === value}
                key={value}
                onClick={() => setYear(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {visible.length ? (
        <>
          <RecordList columns={columns} head={head}>
            {visible.map((entry) => (
              <div className="contents" key={entry.id}>
                {entry.node}
              </div>
            ))}
          </RecordList>
          <p className="text-muted mt-3 text-sm" role="status">
            {visible.length} {visible.length === 1 ? "cobrança" : "cobranças"} neste recorte ·
            recebido <strong className="text-foreground">{formatCurrency(received)}</strong>
            {hidden ? ` · ${hidden} mais antigas não listadas` : ""}
          </p>
        </>
      ) : (
        <section className="empty-state">
          <span className="empty-state__icon">
            <Icon name="receipt" />
          </span>
          <strong>Nenhuma cobrança neste recorte</strong>
          <p>Troque a situação ou o ano para ver as demais.</p>
        </section>
      )}
    </>
  );
}
