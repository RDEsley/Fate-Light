"use client";

import { useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField } from "@/components/ui/form-controls";
import { addDays } from "@/features/mvp/format";

import { createManualAlert } from "./actions";

const shortcuts = [
  { days: 1, label: "Amanhã" },
  { days: 7, label: "Em 7 dias" },
  { days: 15, label: "Em 15 dias" },
  { days: 30, label: "Em 30 dias" },
];

/**
 * Novo lembrete. A data começa vazia, como todo campo de data obrigatório; os atalhos só
 * a preenchem — quem cria um lembrete quase sempre pensa em "daqui a tanto tempo".
 */
export function ManualAlertForm({ today }: { today: string }) {
  const [date, setDate] = useState("");

  return (
    <Form action={createManualAlert} className="grid gap-4">
      <div className="form-grid sm:grid-cols-2">
        <TextField
          className="sm:col-span-2"
          label="O que lembrar"
          maxLength={120}
          minLength={2}
          name="title"
          placeholder="Ex.: renovar contrato, enviar relatório, ligar para o cliente"
          required
        />
        <div className="grid content-start gap-2">
          <DateField
            // A chave refaz o campo quando um atalho escolhe a data por ele.
            defaultValue={date}
            key={date}
            label="Quando"
            name="dueOn"
            onValueChange={setDate}
            required
          />
          <div aria-label="Atalhos de data" className="date-shortcuts" role="group">
            {shortcuts.map((shortcut) => {
              const value = addDays(today, shortcut.days);
              return (
                <button
                  aria-pressed={date === value}
                  key={shortcut.days}
                  onClick={() => setDate(value)}
                  type="button"
                >
                  {shortcut.label}
                </button>
              );
            })}
          </div>
        </div>
        <ChoiceChips
          defaultValue="warning"
          label="Prioridade"
          name="severity"
          options={[
            { label: "Atenção", value: "warning" },
            { label: "Urgente", value: "danger" },
          ]}
        />
      </div>
      <TextField
        label="Observação"
        maxLength={1000}
        multiline
        name="notes"
        optional
        placeholder="Contexto, combinados ou o próximo passo"
        rows={2}
      />
      <FormActions>
        <SubmitButton idleLabel="Criar alerta" pendingLabel="Criando…" />
      </FormActions>
    </Form>
  );
}
