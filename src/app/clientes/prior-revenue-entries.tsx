"use client";

import { useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActions } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { MoneyField } from "@/components/ui/money-field";
import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";

export type PriorRevenueEntry = { amount: number; date: string; id: string };

/** Lista os lançamentos de "histórico anterior ao sistema" já gravados, com edição e
 * exclusão pontuais — sem isso, reabrir o formulário e preencher de novo duplicava o
 * valor (ADR-0017). Vive fora do formulário do cliente: cada linha tem o próprio envio,
 * e formulário dentro de formulário é HTML inválido. */
export function PriorRevenueEntries({
  clientId,
  deleteAction,
  entries,
  updateAction,
}: {
  clientId: string;
  deleteAction: (formData: FormData) => Promise<void>;
  entries: PriorRevenueEntry[];
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!entries.length) return null;

  return (
    <ul className="prior-revenue-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          {editingId === entry.id ? (
            <Form action={updateAction} className="grid gap-4">
              <input name="clientId" type="hidden" value={clientId} />
              <input name="id" type="hidden" value={entry.id} />
              <div className="form-grid sm:grid-cols-2">
                <MoneyField
                  defaultValue={entry.amount}
                  label="Total já recebido"
                  name="priorRevenue"
                  required
                />
                <DateField
                  defaultValue={entry.date}
                  label="Data de referência"
                  name="priorRevenueDate"
                  required
                />
              </div>
              <FormActions>
                <button
                  className="button button--secondary"
                  onClick={() => setEditingId(null)}
                  type="button"
                >
                  Cancelar
                </button>
                <SubmitButton idleLabel="Salvar" pendingLabel="Salvando…" />
              </FormActions>
            </Form>
          ) : (
            <>
              <span>
                <strong>{formatCurrency(entry.amount)}</strong>
                <small>{formatDatePtBr(entry.date)}</small>
              </span>
              <span className="flex flex-wrap gap-2">
                <button
                  className="service-action"
                  onClick={() => setEditingId(entry.id)}
                  type="button"
                >
                  <Icon className="size-3.5" name="edit" /> Editar
                </button>
                <form action={deleteAction}>
                  <input name="clientId" type="hidden" value={clientId} />
                  <input name="id" type="hidden" value={entry.id} />
                  <ConfirmDialog
                    className="service-action service-action--danger"
                    confirmLabel="Excluir valor"
                    confirmation="Este valor sai do total recebido do cliente. Não há como desfazer."
                    icon="trash"
                    label="Excluir"
                    title="Excluir valor de histórico anterior"
                  />
                </form>
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
