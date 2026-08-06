"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { SubmitButton } from "@/app/_components/submit-button";
import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";

export type PriorRevenueEntry = { amount: number; date: string; id: string };

/** Lista os lançamentos de "histórico anterior ao sistema" já gravados, com edição e
 * exclusão pontuais — sem isso, reabrir o formulário e preencher de novo duplicava o
 * valor (ADR-0017). */
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
    <ul className="prior-revenue-list mb-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          {editingId === entry.id ? (
            <form action={updateAction} className="prior-revenue-list__edit">
              <input name="clientId" type="hidden" value={clientId} />
              <input name="id" type="hidden" value={entry.id} />
              <input
                aria-label="Total já recebido"
                defaultValue={entry.amount}
                min="0"
                name="priorRevenue"
                required
                step="0.01"
                type="number"
              />
              <DateField
                defaultValue={entry.date}
                label="Data de referência"
                name="priorRevenueDate"
              />
              <div className="flex gap-2">
                <button className="modal-cancel" onClick={() => setEditingId(null)} type="button">
                  Cancelar
                </button>
                <SubmitButton idleLabel="Salvar" pendingLabel="Salvando…" />
              </div>
            </form>
          ) : (
            <>
              <span>
                <strong>{formatCurrency(entry.amount)}</strong>
                <small>{formatDatePtBr(entry.date)}</small>
              </span>
              <span className="flex gap-2">
                <button type="button" onClick={() => setEditingId(entry.id)}>
                  <Icon className="size-3.5" name="edit" /> Editar
                </button>
                <form action={deleteAction}>
                  <input name="clientId" type="hidden" value={clientId} />
                  <input name="id" type="hidden" value={entry.id} />
                  <ConfirmDialog
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
