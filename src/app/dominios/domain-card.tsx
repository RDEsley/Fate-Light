"use client";

import Link from "next/link";
import { useState } from "react";

import { cancelDomain, deleteDomain, updateDomain } from "@/app/_actions/mvp";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { expiryLabel, formatCurrency, formatDatePtBr, looksLikeHost } from "@/features/mvp/format";

import { DomainForm, type DomainValues } from "./domain-form";

const toneClasses: Record<string, string> = {
  attention: "bg-warning-soft text-warning",
  danger: "bg-negative-soft text-negative",
  ok: "bg-brand-soft text-brand-strong",
  warning: "bg-warning-soft text-warning",
};

export function DomainCard({
  cancelled,
  clientName,
  clients,
  domain,
  today,
}: {
  cancelled: boolean;
  clientName: string;
  clients: (ClientOption & { website?: string | null })[];
  domain: DomainValues;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const expiry = cancelled
    ? { label: "Cancelado", tone: "ok" as const }
    : expiryLabel(domain.expiresOn, today);

  if (editing) {
    return (
      <article className="border-brand/40 rounded-xl border-2 p-4 sm:p-5 md:col-span-2">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-brand-soft text-brand-strong">
            <Icon name="edit" />
          </span>
          <div>
            <h3>Editar {domain.domain}</h3>
            <p>Alterar o vencimento reposiciona os alertas deste domínio.</p>
          </div>
        </div>
        <DomainForm
          action={updateDomain}
          clients={clients}
          domain={domain}
          onCancel={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <article className="cartoon-card p-4 sm:p-5" id={`domain-${domain.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <a
              className="hover:text-brand-strong truncate"
              href={`https://${domain.domain}`}
              rel="noreferrer noopener"
              target="_blank"
            >
              {domain.domain}
            </a>
            <Icon className="text-muted size-3.5 shrink-0" name="link" />
          </h2>
          <Link
            className="text-muted hover:text-brand-strong text-sm"
            href={`/clientes/${domain.clientId}`}
          >
            {clientName}
          </Link>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[expiry.tone] ?? toneClasses.ok}`}
        >
          {expiry.label}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Expira em</dt>
          <dd>{formatDatePtBr(domain.expiresOn)}</dd>
        </div>
        <div>
          <dt className="text-muted">Renovação</dt>
          <dd>{domain.autoRenew ? "Automática" : "Manual"}</dd>
        </div>
        <div>
          <dt className="text-muted">Custo</dt>
          <dd>{domain.cost === null ? "Não informado" : formatCurrency(domain.cost)}</dd>
        </div>
        <div>
          <dt className="text-muted">Pagamento</dt>
          <dd>{domain.paymentResponsibility}</dd>
        </div>
      </dl>
      {domain.registrar ? (
        <p className="text-muted mt-3 flex items-center gap-1.5 text-sm">
          Registrador:{" "}
          {looksLikeHost(domain.registrar) ? (
            <a
              className="text-brand-strong inline-flex items-center gap-1 font-semibold hover:underline"
              href={`https://${domain.registrar}`}
              rel="noreferrer noopener"
              target="_blank"
            >
              <Icon className="size-3.5" name="link" /> {domain.registrar}
            </a>
          ) : (
            domain.registrar
          )}
        </p>
      ) : null}
      {domain.notes ? <p className="service-note mt-3">{domain.notes}</p> : null}

      <div className="service-actions">
        <Link className="service-action" href={`/clientes/${domain.clientId}`}>
          <Icon className="size-4" name="user" /> Ver cliente
        </Link>
        <button className="service-action" onClick={() => setEditing(true)} type="button">
          <Icon className="size-4" name="edit" /> Editar
        </button>
        {!cancelled ? (
          <form action={cancelDomain}>
            <input name="id" type="hidden" value={domain.id} />
            <ConfirmDialog
              className="service-action"
              confirmLabel="Parar de acompanhar"
              confirmation="O domínio para de gerar alertas de expiração, mas continua no histórico e pode ser reativado editando o cadastro."
              icon="x"
              label="Cancelar"
              title={`Cancelar ${domain.domain}`}
              tone="default"
            />
          </form>
        ) : null}
        <form action={deleteDomain}>
          <input name="id" type="hidden" value={domain.id} />
          <ConfirmDialog
            className="service-action service-action--danger"
            confirmLabel="Excluir domínio"
            confirmation={`${domain.domain} sai do sistema para sempre, junto com o histórico de acompanhamento. Não há como desfazer.`}
            icon="trash"
            label="Excluir"
            title={`Excluir ${domain.domain}`}
          />
        </form>
      </div>
    </article>
  );
}
