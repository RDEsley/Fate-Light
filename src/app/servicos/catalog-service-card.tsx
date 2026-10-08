"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatPercent } from "@/features/mvp/format";
import { billingFrequencyLabel } from "@/features/mvp/recurrence";

import { deleteCatalogService, toggleCatalogService, updateCatalogService } from "./actions";
import { ServiceCatalogForm, type CatalogServiceValues } from "./service-catalog-form";

/**
 * Item do catálogo. A edição troca o cartão por um editor de largura inteira: o
 * formulário espremido dentro de um cartão de um terço da tela quebrava as colunas.
 */
export function CatalogServiceCard({
  service,
  usage,
}: {
  service: CatalogServiceValues & { active: boolean };
  /** Quantos clientes usam este item hoje. */
  usage: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <article className="service-card service-card--editing">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-brand-soft text-brand-strong">
            <Icon name="edit" />
          </span>
          <div>
            <h2>Editar {service.name}</h2>
            <p>Vale para as próximas aplicações. Quem já usa o serviço mantém o que combinou.</p>
          </div>
        </div>
        <ServiceCatalogForm
          action={updateCatalogService}
          onCancel={() => setEditing(false)}
          service={service}
        />
      </article>
    );
  }

  return (
    <article className="service-card">
      <div className="service-card__body">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-violet-soft text-violet grid size-9 place-items-center rounded-lg">
            <Icon className="size-4" name="briefcase" />
          </span>
          <span
            className={
              service.active
                ? "service-state service-state--active"
                : "service-state service-state--ended"
            }
          >
            <Icon className="size-3.5" name={service.active ? "check" : "pause"} />
            {service.active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <h2 className="service-card__title mt-3">{service.name}</h2>
        <p className="text-muted mt-1 line-clamp-2 min-h-10 text-sm">
          {service.description ?? "Sem descrição"}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span>
            <small className="text-muted block text-xs">Valor padrão</small>
            <strong className="text-lg">{formatCurrency(service.default_price)}</strong>
          </span>
          <span className="text-muted text-right text-xs">
            {billingFrequencyLabel(service.default_billing_type)}
            {usage ? ` · ${usage} ${usage === 1 ? "cliente" : "clientes"}` : ""}
          </span>
        </div>
        {service.default_adjustment_interval_months ? (
          <p className="service-note mt-3">
            <Icon className="size-4" name="refresh" /> Reajuste a cada{" "}
            {service.default_adjustment_interval_months} meses ·{" "}
            {formatPercent(service.default_adjustment_rate)}
          </p>
        ) : null}
      </div>
      <div className="service-actions">
        <button className="service-action" onClick={() => setEditing(true)} type="button">
          <Icon className="size-4" name="edit" /> Editar
        </button>
        <form action={toggleCatalogService}>
          <input name="id" type="hidden" value={service.id} />
          <input name="active" type="hidden" value={String(!service.active)} />
          <button className="service-action" type="submit">
            <Icon className="size-4" name={service.active ? "pause" : "play"} />
            {service.active ? "Inativar" : "Reativar"}
          </button>
        </form>
        <form action={deleteCatalogService}>
          <input name="id" type="hidden" value={service.id} />
          {usage ? (
            <>
              <input name="detach" type="hidden" value="on" />
              <ConfirmDialog
                className="service-action service-action--danger"
                confirmLabel="Desvincular e excluir"
                confirmation={`${usage} cliente(s) usam este serviço. Eles continuam com o serviço ativo e o valor combinado; apenas o item do catálogo é removido.`}
                icon="trash"
                label="Excluir"
                title={`Excluir ${service.name} do catálogo`}
                tone="default"
              />
            </>
          ) : (
            <ConfirmDialog
              className="service-action service-action--danger"
              confirmLabel="Excluir do catálogo"
              confirmation="O serviço sai do catálogo para sempre. Nenhum cliente usa ele hoje, então nada mais é afetado."
              icon="trash"
              label="Excluir"
              title={`Excluir ${service.name}`}
            />
          )}
        </form>
      </div>
    </article>
  );
}
