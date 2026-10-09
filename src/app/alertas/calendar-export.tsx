"use client";

import { useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { pushToast } from "@/components/ui/toast-store";
import {
  alertBucketLabels,
  alertSources,
  type AlertBucket,
  type AlertRow,
} from "@/features/alerts/board";
import { buildCalendarFile, calendarKey } from "@/features/alerts/calendar";
import { formatDatePtBr } from "@/features/mvp/format";

import {
  markInCalendar,
  readCalendarMarks,
  readServerCalendarMarks,
  subscribeCalendarMarks,
} from "./calendar-store";

export function useCalendarMarks() {
  return useSyncExternalStore(subscribeCalendarMarks, readCalendarMarks, readServerCalendarMarks);
}

const buckets: AlertBucket[] = ["overdue", "week", "later"];

/**
 * Leva vários alertas de uma vez para a agenda. O arquivo .ics funciona no Google Agenda
 * e em qualquer outra; cada evento tem identificador fixo, então importar de novo não
 * duplica. O que já foi levado fica marcado neste navegador e sai da seleção padrão.
 */
export function CalendarExport({ rows }: { rows: AlertRow[] }) {
  const marks = useCalendarMarks();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const pending = rows.filter((row) => !marks.includes(calendarKey(row)));
  const start = () => {
    setSelected(pending.map((row) => row.id));
    setOpen(true);
  };
  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const chosen = rows.filter((row) => selected.includes(row.id));

  const download = () => {
    const file = buildCalendarFile(
      chosen.map((row) => ({
        date: row.date,
        description: [alertSources[row.source].label, row.owner, row.notes]
          .filter(Boolean)
          .join(" · "),
        id: row.id,
        title: row.subject,
      })),
    );
    const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "alertas-fate-light.ics";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    markInCalendar(chosen.map(calendarKey));
    setOpen(false);
    pushToast({
      message: "No Google Agenda: Configurações → Importar e exportar → escolha o arquivo.",
      title: `${chosen.length} ${chosen.length === 1 ? "alerta no arquivo" : "alertas no arquivo"}`,
    });
  };

  return (
    <>
      <button className="button button--secondary" onClick={start} type="button">
        <Icon className="size-4" name="calendar" /> Adicionar à agenda
      </button>
      <Modal
        description="Baixe um arquivo com os alertas escolhidos e importe no Google Agenda. Reimportar não duplica eventos."
        footer={
          <>
            <button className="modal-cancel" onClick={() => setOpen(false)} type="button">
              Voltar
            </button>
            <button
              className="modal-confirm"
              disabled={!chosen.length}
              onClick={download}
              type="button"
            >
              {chosen.length ? `Baixar ${chosen.length} para a agenda` : "Escolha um alerta"}
            </button>
          </>
        }
        icon="calendar"
        onClose={() => setOpen(false)}
        open={open}
        title="Adicionar alertas à agenda"
        tone="default"
      >
        <div className="filter-pills" role="group" aria-label="Seleção rápida">
          <button onClick={() => setSelected(rows.map((row) => row.id))} type="button">
            Todos
          </button>
          <button onClick={() => setSelected(pending.map((row) => row.id))} type="button">
            Só os novos
          </button>
          {buckets.map((bucket) => (
            <button
              key={bucket}
              onClick={() =>
                setSelected(rows.filter((row) => row.bucket === bucket).map((row) => row.id))
              }
              type="button"
            >
              {alertBucketLabels[bucket]}
            </button>
          ))}
          <button onClick={() => setSelected([])} type="button">
            Nenhum
          </button>
        </div>
        <ul className="calendar-pick">
          {rows.map((row) => (
            <li key={row.id}>
              <label>
                <input
                  checked={selected.includes(row.id)}
                  onChange={() => toggle(row.id)}
                  type="checkbox"
                />
                <span className="calendar-pick__text">
                  <strong>{row.subject}</strong>
                  <small>
                    {alertSources[row.source].label} · {formatDatePtBr(row.date)}
                    {row.owner ? ` · ${row.owner}` : ""}
                  </small>
                </span>
                {marks.includes(calendarKey(row)) ? (
                  <span className="calendar-mark">
                    <Icon className="size-3.5" name="check" /> Na agenda
                  </span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
