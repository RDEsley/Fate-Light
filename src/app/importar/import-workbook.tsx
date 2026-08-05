"use client";

import { useRef, useState } from "react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Icon } from "@/components/ui/icon";
import type { ImportActionState } from "@/features/import/types";

import { confirmSpreadsheet, previewSpreadsheet } from "./actions";

const initialState: ImportActionState = { message: "", status: "idle" };

const labels = {
  charges: "Cobranças",
  clients: "Clientes",
  domains: "Domínios",
  expenses: "Despesas",
  services: "Serviços",
};

export function ImportWorkbook() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState<"confirm" | "preview" | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const run = async (mode: "confirm" | "preview") => {
    if (!formRef.current) return;
    setPending(mode);
    const formData = new FormData(formRef.current);
    if (state.preview) formData.set("digest", state.preview.digest);
    const nextState =
      mode === "preview" ? await previewSpreadsheet(formData) : await confirmSpreadsheet(formData);
    setState(nextState);
    if (mode === "preview") setAcknowledged(false);
    setPending(null);
  };

  const issues = state.preview?.issues ?? [];
  const errorCount = issues.filter(({ level }) => level === "error").length;
  const warningCount = issues.length - errorCount;
  const hasErrors = errorCount > 0;

  return (
    <form className="space-y-5" ref={formRef}>
      {state.message ? (
        <FeedbackBanner
          message={state.message}
          tone={
            state.status === "error" || hasErrors
              ? "error"
              : state.status === "success"
                ? "success"
                : "info"
          }
        />
      ) : null}
      <label className="import-dropzone">
        <span className="bg-brand-soft text-brand-strong grid size-12 place-items-center rounded-2xl">
          <Icon name="upload" />
        </span>
        <span>
          <strong className="block">Escolha sua planilha</strong>
          <span className="text-muted mt-1 block text-sm">
            Excel .xlsx ou CSV, até 4 MB e 1.000 registros.
          </span>
        </span>
        <input
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="mt-4 block w-full text-sm"
          name="file"
          onChange={() => setState(initialState)}
          required
          type="file"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 font-black disabled:opacity-60"
          disabled={pending !== null}
          onClick={() => void run("preview")}
          type="button"
        >
          {pending === "preview" ? "Analisando…" : "Gerar prévia"}
        </button>
        <a
          className="border-line hover:bg-brand-soft min-h-11 rounded-xl border px-5 py-2.5 font-bold"
          href="/importar/modelo.csv"
        >
          Baixar modelo CSV
        </a>
      </div>

      {state.preview ? (
        <section className="space-y-5" aria-label="Prévia da importação">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Object.entries(state.preview.counts).map(([name, count]) => (
              <article className="cartoon-card p-4" key={name}>
                <p className="text-muted text-xs font-bold">
                  {labels[name as keyof typeof labels]}
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums">{count}</p>
              </article>
            ))}
          </div>

          {state.preview.issues.length ? (
            <div className="panel-card p-0!">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <h2 className="font-black">O que precisa da sua atenção</h2>
                  <p className="text-muted mt-1 text-sm">
                    Erros bloqueiam o lote inteiro. Avisos deixam importar, mas vale conferir.
                  </p>
                </div>
                <div className="flex gap-2">
                  {errorCount ? (
                    <span className="bg-negative-soft text-negative rounded-full px-3 py-1 text-xs font-black">
                      {errorCount} {errorCount === 1 ? "erro" : "erros"}
                    </span>
                  ) : null}
                  {warningCount ? (
                    <span className="bg-warning-soft text-warning rounded-full px-3 py-1 text-xs font-black">
                      {warningCount} {warningCount === 1 ? "aviso" : "avisos"}
                    </span>
                  ) : null}
                </div>
              </div>
              <ul className="max-h-80 divide-y overflow-auto">
                {/* Erros primeiro: são eles que impedem a importação de seguir. */}
                {[...state.preview.issues]
                  .sort((left, right) =>
                    left.level === right.level
                      ? left.row - right.row
                      : left.level === "error"
                        ? -1
                        : 1,
                  )
                  .map((item, index) => (
                    <li
                      className="flex gap-3 px-5 py-3 text-sm"
                      key={`${item.sheet}-${item.row}-${index}`}
                    >
                      <Icon
                        className={`mt-0.5 size-4 shrink-0 ${item.level === "error" ? "text-negative" : "text-warning"}`}
                        name="alert"
                      />
                      <span className="min-w-0">
                        <strong>
                          {item.sheet} · linha {item.row}
                          {item.field ? ` · coluna ${item.field}` : ""}
                        </strong>
                        <span className="text-muted mt-0.5 block">{item.message}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {state.preview.legacy ? (
            <label className="bg-warning-soft border-warning/25 flex items-start gap-3 rounded-xl border-2 p-4 text-sm">
              <input
                checked={acknowledged}
                className="mt-1 size-5"
                name="acknowledgeLegacy"
                onChange={(event) => setAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong className="block">Confirmo o mapeamento legado</strong>
                <span className="text-muted mt-1 block leading-6">
                  Planning Value e Mens/ ADS serão receita própria; despesas serão pendentes e os
                  totais manuais não serão importados.
                </span>
              </span>
            </label>
          ) : null}

          <button
            className="bg-positive border-positive min-h-11 rounded-xl border-2 px-6 font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={pending !== null || hasErrors || (state.preview.legacy && !acknowledged)}
            onClick={() => void run("confirm")}
            type="button"
          >
            {pending === "confirm"
              ? "Importando…"
              : `Confirmar ${state.preview.rowCount} registros`}
          </button>
        </section>
      ) : null}

      {state.result && !state.result.duplicate ? (
        <div className="panel-card">
          <h2 className="font-black">Resultado do lote</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(state.result.counts).map(([name, count]) => (
              <span
                className="bg-positive-soft text-positive rounded-full px-3 py-1.5 text-sm font-bold"
                key={name}
              >
                {name}: {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
