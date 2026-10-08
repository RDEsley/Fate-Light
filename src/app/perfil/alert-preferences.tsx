"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FormActions } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { Form } from "@/components/ui/form";
import { useFieldFeedback } from "@/components/ui/form-context";
import { Icon } from "@/components/ui/icon";
import {
  alertOffsetLabel,
  maxAlertOffsetDays,
  maxAlertOffsets,
  parseAlertOffset,
  presetAlertOffsets,
} from "@/features/alerts/offsets";
import { initialActionState } from "@/lib/forms/action-state";

import { updateAlertPreferences } from "./actions";

/** Ao menos uma antecedência, e não mais do que o banco aceita guardar. */
function validateOffsets(formData: FormData): Record<string, string> {
  const count = formData.getAll("alertOffsets").length;
  if (!count) return { alertOffsets: "Escolha ao menos uma antecedência." };
  if (count > maxAlertOffsets) {
    return { alertOffsets: `Escolha no máximo ${maxAlertOffsets} antecedências.` };
  }
  return {};
}

function OffsetChips({
  options,
  onToggle,
  selected,
}: {
  onToggle: (days: number) => void;
  options: number[];
  selected: number[];
}) {
  const feedback = useFieldFeedback("alertOffsets");

  return (
    <>
      {options.map((days) => (
        <label className="chip" key={days}>
          <input
            checked={selected.includes(days)}
            name="alertOffsets"
            onChange={() => {
              feedback.clear();
              onToggle(days);
            }}
            type="checkbox"
            value={days}
          />
          <span>{alertOffsetLabel(days)}</span>
        </label>
      ))}
      {feedback.error ? (
        <span className="basis-full">
          <FieldError message={feedback.error} />
        </span>
      ) : null}
    </>
  );
}

export function AlertPreferences({ offsets }: { offsets: number[] }) {
  const [state, formAction] = useActionState(updateAlertPreferences, initialActionState);
  const [selected, setSelected] = useState<number[]>(offsets);
  // Valores fora da lista pronta continuam visíveis depois de desmarcados, até salvar.
  const [custom, setCustom] = useState<number[]>(() =>
    offsets.filter((days) => !presetAlertOffsets.includes(days)),
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const options = [...new Set([...presetAlertOffsets, ...custom])].sort(
    (left, right) => left - right,
  );
  const horizon = selected.length ? Math.max(...selected) : 0;

  const toggle = (days: number) => {
    setSelected((current) =>
      current.includes(days) ? current.filter((value) => value !== days) : [...current, days],
    );
  };

  const addCustom = () => {
    const days = parseAlertOffset(draft);
    if (days === null) {
      setDraftError(`Use um número inteiro de 0 a ${maxAlertOffsetDays}.`);
      return;
    }
    setCustom((current) => (options.includes(days) ? current : [...current, days]));
    setSelected((current) => (current.includes(days) ? current : [...current, days]));
    setDraft("");
    setDraftError(null);
    setAdding(false);
  };

  return (
    <section className="panel-card scroll-mt-24" id="alertas">
      <div className="section-heading mb-4">
        <span className="section-heading__icon bg-warning-soft text-warning">
          <Icon name="bell" />
        </span>
        <div>
          <h2 className="flex items-center gap-1.5">
            Antecedência dos alertas
            <FieldHint>
              Define com quantos dias antes do vencimento cada cobrança, despesa ou domínio aparece
              no sino e na central de alertas.
            </FieldHint>
          </h2>
          <p>Marque quantas quiser. A maior delas define até onde o radar enxerga.</p>
        </div>
      </div>

      <Form action={formAction} className="grid gap-4" state={state} validate={validateOffsets}>
        <div aria-label="Antecedências" className="chip-group" role="group">
          <OffsetChips onToggle={toggle} options={options} selected={selected} />
          {adding ? null : (
            <button
              className="chip chip--add"
              onClick={() => setAdding(true)}
              type="button"
            >
              <Icon className="size-3.5" name="plus" /> Personalizado
            </button>
          )}
        </div>

        {adding ? (
          <div className="custom-offset">
            <label className="field__label" htmlFor="custom-alert-offset">
              Avisar com quantos dias de antecedência?
            </label>
            <div className="custom-offset__row">
              <input
                aria-describedby={draftError ? "custom-alert-offset-error" : undefined}
                aria-invalid={draftError ? true : undefined}
                autoFocus
                id="custom-alert-offset"
                inputMode="numeric"
                maxLength={3}
                onChange={(event) => {
                  setDraft(event.target.value.replace(/\D/g, ""));
                  setDraftError(null);
                }}
                onKeyDown={(event) => {
                  // Enter aqui adiciona a antecedência; não envia o formulário inteiro.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustom();
                  }
                  if (event.key === "Escape") setAdding(false);
                }}
                placeholder="Ex.: 45"
                value={draft}
              />
              <button className="button button--secondary" onClick={addCustom} type="button">
                Adicionar
              </button>
              <button
                className="button button--ghost"
                onClick={() => {
                  setAdding(false);
                  setDraft("");
                  setDraftError(null);
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
            {draftError ? <FieldError id="custom-alert-offset-error" message={draftError} /> : null}
          </div>
        ) : null}

        <p className="helper-note">
          <Icon className="size-4 shrink-0" name="info" />
          {selected.length
            ? horizon === 0
              ? "O radar mostra os itens no próprio dia do vencimento."
              : `O radar mostra o que vence em até ${horizon} ${horizon === 1 ? "dia" : "dias"}. Nada além disso aparece nos alertas.`
            : "Sem nenhuma opção marcada você não recebe aviso nenhum. Escolha ao menos uma."}
        </p>

        <FormActions>
          <SubmitButton idleLabel="Salvar antecedência" pendingLabel="Salvando…" />
        </FormActions>
      </Form>
    </section>
  );
}
