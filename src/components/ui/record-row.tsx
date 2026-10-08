"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";

import { classNames } from "./field";
import { Icon } from "./icon";

export type RecordTone = "danger" | "muted" | "neutral" | "positive" | "warning";

/**
 * Lista densa de registros financeiros. Em tela larga as linhas dividem as mesmas
 * colunas, como uma tabela; em tela estreita cada linha vira duas faixas curtas. A
 * largura que decide é a do próprio bloco (container query), não a da janela: com a
 * barra lateral aberta a área útil é bem menor que a tela.
 */
export function RecordList({
  children,
  className,
  columns,
  head,
}: {
  children: ReactNode;
  className?: string;
  /** `grid-template-columns` das linhas em tela larga. */
  columns: string;
  /** Rótulos das colunas, na mesma ordem das células. */
  head: string[];
}) {
  return (
    <div
      className={classNames("record-list", className)}
      style={{ "--record-columns": columns } as CSSProperties}
    >
      <div aria-hidden="true" className="record-list__head">
        {head.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      {children}
    </div>
  );
}

/** Divisor com título dentro da lista, como "Resolvidas". */
export function RecordGroup({ children }: { children: ReactNode }) {
  return <p className="record-list__group">{children}</p>;
}

/** Valor de uma coluna. O rótulo fica só para leitor de tela quando há cabeçalho visível. */
export function RecordCell({
  children,
  label,
  note,
}: {
  children: ReactNode;
  label: string;
  note?: ReactNode;
}) {
  return (
    <span className="record-cell">
      <span className="record-cell__label">{label}</span>
      <span className="record-cell__value">{children}</span>
      {note ? <small className="record-cell__note">{note}</small> : null}
    </span>
  );
}

/**
 * Uma linha da lista. O título é o botão que abre os detalhes e a área clicável cobre a
 * linha inteira; a ação rápida fica por cima dela. Os detalhes só são montados quando a
 * linha abre: uma lista com centenas de registros não carrega centenas de formulários.
 */
export function RecordRow({
  amount,
  amountNote,
  cells,
  children,
  defaultOpen = false,
  headingLevel = 2,
  id,
  quickAction,
  status,
  subtitle,
  title,
  tone = "neutral",
}: {
  amount?: ReactNode;
  amountNote?: ReactNode;
  cells?: ReactNode;
  /** Detalhes e ações secundárias, exibidos ao abrir a linha. */
  children: ReactNode;
  defaultOpen?: boolean;
  headingLevel?: 2 | 3;
  id?: string;
  quickAction?: ReactNode;
  status?: ReactNode;
  subtitle?: ReactNode;
  title: string;
  tone?: RecordTone;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="record-row" data-open={open ? "true" : undefined} data-tone={tone} id={id}>
      <div className="record-row__bar">
        <div className="record-row__main">
          <Heading className="record-row__title">
            <button
              aria-controls={open ? panelId : undefined}
              aria-expanded={open}
              className="record-row__toggle"
              onClick={() => setOpen((current) => !current)}
              type="button"
            >
              {title}
            </button>
          </Heading>
          {subtitle ? <p className="record-row__subtitle">{subtitle}</p> : null}
        </div>
        <div className="record-row__meta">
          {cells}
          {status ? <span className="record-row__status">{status}</span> : null}
        </div>
        <div className="record-row__amount">
          {amount ? <strong>{amount}</strong> : null}
          {amountNote ? <small>{amountNote}</small> : null}
        </div>
        <div className="record-row__quick">{quickAction}</div>
        <Icon className="record-row__chevron size-4" name="chevron-down" />
      </div>
      {open ? (
        <div className="record-row__panel" id={panelId}>
          {children}
        </div>
      ) : null}
    </article>
  );
}
