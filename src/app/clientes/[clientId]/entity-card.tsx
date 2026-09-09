"use client";

import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { clientEntityTypeLabel } from "@/features/clients/entity-schemas";
import { formatCurrency } from "@/features/mvp/format";

import { archiveClientEntity, restoreClientEntity } from "./entity-actions";
import { ClientEntityForm, type ClientEntityValues } from "./entity-form";

export type ClientEntitySummary = ClientEntityValues & {
  activeDomains: number;
  activeServices: number;
  archived: boolean;
  paidRevenue: number;
  pendingCharges: number;
};

export function ClientEntityCard({
  clientId,
  entity,
  readOnly = false,
}: {
  clientId: string;
  entity: ClientEntitySummary;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <article className="border-brand/40 rounded-xl border-2 p-4">
        <h3 className="font-black">Editar {entity.displayName}</h3>
        <ClientEntityForm
          clientId={clientId}
          entity={entity}
          onCancel={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <article className="entity-card" data-archived={entity.archived ? "true" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-black break-words">{entity.displayName}</h3>
        <span className={`entity-chip ${entity.archived ? "entity-chip--muted" : ""}`}>
          {entity.archived ? "Arquivada" : clientEntityTypeLabel(entity.entityType)}
        </span>
      </div>
      {entity.legalName ? <p className="text-muted text-xs">{entity.legalName}</p> : null}
      <div className="entity-card__signals" aria-label="Resumo desta empresa/marca">
        <span title={`${entity.activeServices} serviço(s) ativo(s)`}>
          <Icon name="briefcase" /> {entity.activeServices}
        </span>
        <span title={`${entity.activeDomains} domínio(s) ativo(s)`}>
          <Icon name="globe" /> {entity.activeDomains}
        </span>
        {entity.pendingCharges ? (
          <span className="is-warning" title={`${entity.pendingCharges} cobrança(s) pendente(s)`}>
            <Icon name="receipt" /> {entity.pendingCharges}
          </span>
        ) : null}
        {entity.paidRevenue > 0 ? (
          <span className="is-positive" title="Receita própria já recebida nesta empresa/marca">
            <Icon name="wallet" /> {formatCurrency(entity.paidRevenue)}
          </span>
        ) : null}
      </div>
      <div className="entity-card__actions">
        <Link
          className="text-brand-strong text-xs font-black"
          href={`/cobrancas?clientId=${clientId}&entity=${entity.id}`}
        >
          Abrir cobranças →
        </Link>
        {readOnly ? null : entity.archived ? (
          <form action={restoreClientEntity}>
            <input name="clientId" type="hidden" value={clientId} />
            <input name="entityId" type="hidden" value={entity.id} />
            <button className="text-muted hover:text-foreground text-xs font-bold" type="submit">
              Reativar
            </button>
          </form>
        ) : (
          <>
            <button
              className="text-muted hover:text-foreground text-xs font-bold"
              onClick={() => setEditing(true)}
              type="button"
            >
              Editar
            </button>
            <form action={archiveClientEntity}>
              <input name="clientId" type="hidden" value={clientId} />
              <input name="entityId" type="hidden" value={entity.id} />
              <ConfirmDialog
                className="text-muted hover:text-foreground text-xs font-bold"
                confirmLabel="Arquivar empresa/marca"
                confirmation="Ela sai das opções de novos lançamentos. Serviços, cobranças, despesas e domínios já vinculados continuam apontando para ela."
                icon="archive"
                label="Arquivar"
                title={`Arquivar ${entity.displayName}`}
                tone="default"
              />
            </form>
          </>
        )}
      </div>
    </article>
  );
}
