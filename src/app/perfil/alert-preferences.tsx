"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldHint } from "@/components/ui/field-hint";
import { Icon } from "@/components/ui/icon";
import { initialActionState } from "@/lib/forms/action-state";

import { updateAlertPreferences } from "./actions";

const options = [60, 30, 15, 7, 3, 1, 0] as const;

function optionLabel(days: number) {
  if (days === 0) return "No dia";
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

export function AlertPreferences({ offsets }: { offsets: number[] }) {
  const [state, formAction] = useActionState(updateAlertPreferences, initialActionState);
  const [selected, setSelected] = useState<number[]>(offsets);

  const toggle = (days: number) => {
    setSelected((current) =>
      current.includes(days) ? current.filter((value) => value !== days) : [...current, days],
    );
  };

  const horizon = selected.length ? Math.max(...selected) : 0;

  return (
    <section className="panel-card scroll-mt-24" id="alertas">
      <div className="section-heading mb-4">
        <span className="section-heading__icon bg-warning-soft text-warning">
          <Icon name="bell" />
        </span>
        <div>
          <h2>
            Antecedência dos alertas
            <FieldHint>
              Define com quantos dias antes do vencimento cada cobrança, despesa ou domínio aparece
              no sino e na central de alertas.
            </FieldHint>
          </h2>
          <p>Escolha quando quer ser avisado antes de um vencimento.</p>
        </div>
      </div>

      <form action={formAction} className="grid gap-3">
        {state.message ? (
          <FeedbackBanner
            message={state.message}
            tone={state.status === "error" ? "error" : "success"}
          />
        ) : null}
        <div className="alert-offsets">
          {options.map((days) => (
            <label className="alert-offsets__option" key={days}>
              <input
                checked={selected.includes(days)}
                name="alertOffsets"
                onChange={() => toggle(days)}
                type="checkbox"
                value={days}
              />
              <span>{optionLabel(days)}</span>
            </label>
          ))}
        </div>
        <p className="helper-note">
          <Icon className="size-4 shrink-0" name="info" />
          {selected.length
            ? `O radar enxerga até ${horizon} dia(s) à frente. Nada com vencimento além disso aparece nos alertas.`
            : "Sem nenhuma opção marcada você não recebe aviso nenhum. Escolha ao menos uma."}
        </p>
        <div className="flex justify-end">
          <SubmitButton idleLabel="Salvar antecedência" pendingLabel="Salvando…" />
        </div>
      </form>
    </section>
  );
}
