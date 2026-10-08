"use client";

import Link from "next/link";
import { useState } from "react";

import { cancelDomain, deleteDomain, reactivateDomain, updateDomain } from "@/app/_actions/mvp";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ClientEntityOption, ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { RecordCell, RecordRow, type RecordTone } from "@/components/ui/record-row";
import { expiryLabel, formatCurrency, formatDatePtBr, looksLikeHost } from "@/features/mvp/format";

import { DomainForm, type DomainValues } from "./domain-form";

/** Colunas da lista de domínios em tela larga; a lista e as linhas usam a mesma medida. */
export const domainColumns = "minmax(0, 1fr) 7rem 6.5rem 10.5rem 7rem 2.25rem 1rem";
export const domainColumnLabels = [
  "Domínio",
  "Expira em",
  "Renovação",
  "Situação",
  "Custo",
  "",
  "",
];

const statusClasses: Record<string, string> = {
  attention: "charge-status--pending",
  danger: "charge-status--overdue",
  ok: "charge-status--paid",
  warning: "charge-status--pending",
};

const rowTones: Record<string, RecordTone> = {
  attention: "warning",
  danger: "danger",
  ok: "positive",
  warning: "warning",
};

/**
 * Um domínio em uma linha. O que se consulta todo dia (prazo e situação) fica à vista;
 * responsável, registrador, observações e as ações aparecem ao abrir a linha.
 */
export function DomainCard({
  cancelled,
  clientName,
  clients,
  defaultOpen = false,
  domain,
  entities = [],
  entityName,
  today,
}: {
  cancelled: boolean;
  clientName: string;
  clients: (ClientOption & { website?: string | null })[];
  defaultOpen?: boolean;
  domain: DomainValues;
  entities?: ClientEntityOption[];
  entityName?: string | null;
  today: string;
}) {
  const [editing, setEditing] = useState(false);
  const expiry = expiryLabel(domain.expiresOn, today);

  if (editing) {
    return (
      <article className="service-card service-card--editing record-list__editor">
        <div className="section-heading mb-5">
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
          entities={entities}
          onCancel={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <RecordRow
      amount={domain.cost === null ? "—" : formatCurrency(domain.cost)}
      cells={
        <>
          <RecordCell label="Expira em">{formatDatePtBr(domain.expiresOn)}</RecordCell>
          <RecordCell label="Renovação">{domain.autoRenew ? "Automática" : "Manual"}</RecordCell>
        </>
      }
      defaultOpen={defaultOpen}
      id={`domain-${domain.id}`}
      quickAction={
        <a
          aria-label={`Abrir ${domain.domain} em nova aba`}
          className="record-row__icon-action"
          href={`https://${domain.domain}`}
          rel="noreferrer noopener"
          target="_blank"
        >
          <Icon className="size-4" name="link" />
        </a>
      }
      status={
        cancelled ? (
          <span className="charge-status charge-status--cancelled">Cancelado</span>
        ) : (
          <span className={`charge-status ${statusClasses[expiry.tone] ?? statusClasses.ok}`}>
            {expiry.label}
          </span>
        )
      }
      subtitle={[clientName, entityName].filter(Boolean).join(" · ")}
      title={domain.domain}
      tone={cancelled ? "muted" : (rowTones[expiry.tone] ?? "neutral")}
    >
      <dl className="record-facts">
        <div>
          <dt>Quem paga</dt>
          <dd>{domain.paymentResponsibility}</dd>
        </div>
        <div>
          <dt>Registrador</dt>
          <dd>
            {domain.registrar ? (
              looksLikeHost(domain.registrar) ? (
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
              )
            ) : (
              "Não informado"
            )}
          </dd>
        </div>
        <div>
          <dt>Custo</dt>
          <dd>{domain.cost === null ? "Não informado" : formatCurrency(domain.cost)}</dd>
        </div>
      </dl>
      {domain.notes ? <p className="service-note">{domain.notes}</p> : null}

      <div className="record-actions">
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
              confirmation="O domínio para de gerar alertas de expiração e fica na lista como cancelado. Você pode voltar a acompanhá-lo quando quiser."
              icon="x"
              label="Parar de acompanhar"
              title={`Parar de acompanhar ${domain.domain}`}
              tone="default"
              triggerIcon="x"
            />
          </form>
        ) : (
          <form action={reactivateDomain}>
            <input name="id" type="hidden" value={domain.id} />
            <button className="service-action" type="submit">
              <Icon className="size-4" name="refresh" /> Voltar a acompanhar
            </button>
          </form>
        )}
        <form action={deleteDomain}>
          <input name="id" type="hidden" value={domain.id} />
          <ConfirmDialog
            className="service-action service-action--danger"
            confirmLabel="Excluir domínio"
            confirmation={`${domain.domain} sai do sistema para sempre, junto com o histórico de acompanhamento. Não há como desfazer.`}
            icon="trash"
            label="Excluir"
            title={`Excluir ${domain.domain}`}
            triggerIcon="trash"
          />
        </form>
      </div>
    </RecordRow>
  );
}
