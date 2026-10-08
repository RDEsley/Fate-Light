"use client";

import type { Route } from "next";
import Link from "next/link";
import { Fragment, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { Icon, type IconName } from "@/components/ui/icon";
import { RecordCell, RecordGroup, RecordList, RecordRow } from "@/components/ui/record-row";
import {
  alertBucketLabels,
  alertSourceOrder,
  alertSources,
  type AlertBucket,
  type AlertRow,
  type AlertSource,
} from "@/features/alerts/board";
import { formatDatePtBr } from "@/features/mvp/format";

import { resolveManualAlert, snoozeManualAlert } from "./actions";

type BucketFilter = AlertBucket | "all";
type SourceFilter = AlertSource | "all";

const columns = "minmax(0, 1fr) 6.5rem 7.5rem 6.5rem 6.75rem 1rem";
const columnLabels = ["Alerta", "Tipo", "Prazo", "Data", "", ""];

const bucketCards: { icon: IconName; tone: string; value: BucketFilter }[] = [
  { icon: "alert-circle", tone: "negative", value: "overdue" },
  { icon: "calendar", tone: "warning", value: "week" },
  { icon: "history", tone: "violet", value: "later" },
  { icon: "bell", tone: "brand", value: "all" },
];

const deadlineClasses = {
  danger: "charge-status--overdue",
  neutral: "charge-status--cancelled",
  warning: "charge-status--pending",
};

const sourceIcons: Record<AlertSource, IconName> = {
  adjustment: "briefcase",
  charge: "receipt",
  domain: "globe",
  expense: "wallet",
  manual: "bell",
};

const groupTitles: Record<AlertBucket, string> = {
  later: "Mais adiante",
  overdue: "Atrasados",
  week: "Esta semana",
};

const snoozeOptions = [
  { days: "1", label: "Adiar para amanhã" },
  { days: "7", label: "Adiar 7 dias" },
  { days: "30", label: "Adiar 30 dias" },
];

/**
 * Central de alertas: os cartões do topo são o filtro por prazo, as pílulas filtram por
 * tipo e a lista mostra uma linha por alerta. Tudo é filtrado no navegador — a lista já
 * veio inteira, então trocar de filtro não custa uma ida ao servidor.
 */
export function AlertBoard({ rows, total }: { rows: AlertRow[]; total: number }) {
  const [bucket, setBucket] = useState<BucketFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");

  const inBucket = bucket === "all" ? rows : rows.filter((row) => row.bucket === bucket);
  const visible = source === "all" ? inBucket : inBucket.filter((row) => row.source === source);
  const sources = alertSourceOrder.filter((value) => rows.some((row) => row.source === value));
  const filtering = bucket !== "all" || source !== "all";
  const countIn = (value: BucketFilter) =>
    value === "all" ? total : rows.filter((row) => row.bucket === value).length;

  const clear = () => {
    setBucket("all");
    setSource("all");
  };

  return (
    <>
      <div aria-label="Filtrar alertas por prazo" className="alert-filters" role="group">
        {bucketCards.map((card) => {
          const selected = bucket === card.value;
          return (
            <button
              aria-pressed={selected}
              className="alert-filter"
              data-tone={card.tone}
              key={card.value}
              // Clicar de novo no cartão ativo solta o filtro, como um interruptor.
              onClick={() => setBucket(selected ? "all" : card.value)}
              type="button"
            >
              <span className="alert-filter__icon">
                <Icon className="size-4" name={selected ? "check" : card.icon} />
              </span>
              <span className="alert-filter__label">
                {card.value === "all" ? "Total aberto" : alertBucketLabels[card.value]}
              </span>
              <strong className="alert-filter__value">{countIn(card.value)}</strong>
            </button>
          );
        })}
      </div>

      {sources.length > 1 || filtering ? (
        <div className="alert-toolbar">
          {sources.length > 1 ? (
            <div aria-label="Filtrar alertas por tipo" className="filter-pills" role="group">
              <button
                aria-pressed={source === "all"}
                onClick={() => setSource("all")}
                type="button"
              >
                Todos os tipos
              </button>
              {sources.map((value) => (
                <button
                  aria-pressed={source === value}
                  key={value}
                  onClick={() => setSource(source === value ? "all" : value)}
                  type="button"
                >
                  {alertSources[value].plural}
                  <span>{inBucket.filter((row) => row.source === value).length}</span>
                </button>
              ))}
            </div>
          ) : null}
          {filtering ? (
            <p className="alert-toolbar__status" role="status">
              <span>
                {visible.length} de {rows.length} {rows.length === 1 ? "alerta" : "alertas"}
              </span>
              <button className="alert-toolbar__clear" onClick={clear} type="button">
                <Icon className="size-3.5" name="x" /> Limpar filtro
              </button>
            </p>
          ) : null}
        </div>
      ) : null}

      {visible.length ? (
        <RecordList columns={columns} head={columnLabels}>
          {visible.map((row, index) => (
            <Fragment key={row.id}>
              {bucket === "all" && visible[index - 1]?.bucket !== row.bucket ? (
                <RecordGroup>{groupTitles[row.bucket]}</RecordGroup>
              ) : null}
              <AlertListRow row={row} />
            </Fragment>
          ))}
        </RecordList>
      ) : (
        <section className="empty-state">
          <span className="empty-state__icon">
            <Icon name="check" />
          </span>
          <strong>Nenhum alerta neste filtro</strong>
          <p>Não há nada aberto com essa combinação de prazo e tipo.</p>
          <button className="button button--secondary button--small" onClick={clear} type="button">
            Limpar filtro
          </button>
        </section>
      )}
    </>
  );
}

function AlertListRow({ row }: { row: AlertRow }) {
  const kind = alertSources[row.source];
  const subtitle = [row.urgent ? "Urgente" : null, row.owner, row.manualId ? row.notes : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <RecordRow
      amount={formatDatePtBr(row.date)}
      cells={<RecordCell label="Tipo">{kind.label}</RecordCell>}
      id={row.id}
      quickAction={
        row.manualId ? (
          <form action={resolveManualAlert}>
            <input name="id" type="hidden" value={row.manualId} />
            <SubmitButton className="button--small" idleLabel="Resolver" pendingLabel="…" />
          </form>
        ) : (
          <Link
            aria-label={`${kind.open}: ${row.subject}`}
            className="button button--secondary button--small"
            href={row.href as Route}
          >
            Abrir
          </Link>
        )
      }
      status={
        <span className={`charge-status ${deadlineClasses[row.deadline.tone]}`}>
          {row.deadline.label}
        </span>
      }
      subtitle={subtitle || undefined}
      title={row.subject}
      tone={row.bucket === "overdue" ? "danger" : "neutral"}
    >
      <dl className="record-facts">
        <div>
          <dt>Tipo</dt>
          <dd>{kind.label}</dd>
        </div>
        <div>
          <dt>{row.manualId ? "Data do lembrete" : "Vencimento"}</dt>
          <dd>{formatDatePtBr(row.date)}</dd>
        </div>
        {row.owner ? (
          <div>
            <dt>Cliente</dt>
            <dd>{row.owner}</dd>
          </div>
        ) : null}
        {row.manualId ? (
          <div>
            <dt>Prioridade</dt>
            <dd>{row.urgent ? "Urgente" : "Atenção"}</dd>
          </div>
        ) : null}
      </dl>
      {row.manualId && row.notes ? (
        <p className="helper-note">
          <Icon className="size-4" name="info" /> {row.notes}
        </p>
      ) : null}
      <div className="record-actions">
        {row.manualId ? (
          snoozeOptions.map((option) => (
            <form action={snoozeManualAlert} key={option.days}>
              <input name="id" type="hidden" value={row.manualId} />
              <input name="days" type="hidden" value={option.days} />
              <button className="service-action" type="submit">
                <Icon className="size-4" name="history" /> {option.label}
              </button>
            </form>
          ))
        ) : (
          <Link className="service-action" href={row.href as Route}>
            <Icon className="size-4" name={sourceIcons[row.source]} /> {kind.open}
          </Link>
        )}
        <a
          className="service-action"
          href={row.calendarUrl}
          rel="noreferrer noopener"
          target="_blank"
        >
          <Icon className="size-4" name="calendar" /> Adicionar ao Google Agenda
        </a>
      </div>
    </RecordRow>
  );
}
