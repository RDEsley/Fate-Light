"use client";

import Link from "next/link";
import { useState } from "react";

import { deleteClientService, setClientServiceState } from "@/app/_actions/mvp";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";
import { billingFrequencyLabel } from "@/features/mvp/recurrence";

import {
  ServiceApplicationForm,
  type CatalogServiceOption,
  type ClientServiceValues,
} from "./service-application-form";

const stateBadges: Record<string, { className: string; icon: IconName; label: string }> = {
  active: { className: "service-state service-state--active", icon: "check", label: "Ativo" },
  paused: { className: "service-state service-state--paused", icon: "pause", label: "Pausado" },
  ended: { className: "service-state service-state--ended", icon: "archive", label: "Encerrado" },
};

function StateForm({
  clientId,
  icon,
  label,
  serviceId,
  state,
}: {
  clientId: string;
  icon: IconName;
  label: string;
  serviceId: string;
  state: "active" | "paused" | "ended";
}) {
  return (
    <form action={setClientServiceState}>
      <input name="clientId" type="hidden" value={clientId} />
      <input name="id" type="hidden" value={serviceId} />
      <input name="state" type="hidden" value={state} />
      <button className="service-action" type="submit">
        <Icon className="size-4" name={icon} /> {label}
      </button>
    </form>
  );
}

export function ServiceCard({
  catalog,
  clientId,
  duration,
  service,
}: {
  catalog: CatalogServiceOption[];
  clientId: string;
  duration: string;
  service: ClientServiceValues & {
    nextAdjustmentDate: string | null;
    promotionalCyclesUsed: number;
    status: string;
  };
}) {
  const [editing, setEditing] = useState(false);
  const badge = stateBadges[service.status] ?? stateBadges.ended;

  if (editing) {
    return (
      <article className="border-brand/40 rounded-xl border-2 p-5 lg:col-span-2">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-brand-soft text-brand-strong">
            <Icon name="edit" />
          </span>
          <div>
            <h3>Editar {service.name}</h3>
            <p>Cobranças já pagas não mudam. As pendentes acompanham o novo valor.</p>
          </div>
        </div>
        <ServiceApplicationForm
          catalog={catalog}
          clientId={clientId}
          onCancel={() => setEditing(false)}
          service={service}
        />
      </article>
    );
  }

  const remainingPromo =
    service.promotionalCycles === null
      ? 0
      : Math.max(0, service.promotionalCycles - service.promotionalCyclesUsed);

  return (
    <article className="border-line rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{service.name}</h3>
        <span className={badge.className}>
          <Icon className="size-3.5" name={badge.icon} /> {badge.label}
        </span>
      </div>
      {service.description ? (
        <p className="text-muted mt-2 text-sm">{service.description}</p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Valor cheio</dt>
          <dd>{formatCurrency(service.listPrice)}</dd>
        </div>
        <div>
          <dt className="text-muted">Valor aplicado</dt>
          <dd className="text-positive font-black">
            {formatCurrency(
              service.discountType === "percentage"
                ? service.listPrice * (1 - service.discountValue / 100)
                : service.discountType === "fixed"
                  ? service.listPrice - service.discountValue
                  : service.listPrice,
            )}
          </dd>
          {service.discountType !== "none" ? (
            <small className="text-muted">
              desconto de{" "}
              {service.discountType === "percentage"
                ? `${service.discountValue}%`
                : formatCurrency(service.discountValue)}
            </small>
          ) : null}
        </div>
        <div>
          <dt className="text-muted">Cobrança</dt>
          <dd>{billingFrequencyLabel(service.billingType)}</dd>
          {service.billingType === "single" && service.installmentCount > 1 ? (
            <small className="text-muted">{service.installmentCount} parcelas</small>
          ) : null}
        </div>
        <div>
          <dt className="text-muted">Próximo vencimento</dt>
          <dd>
            {service.status === "paused"
              ? "Pausado"
              : service.nextDueDate
                ? formatDatePtBr(service.nextDueDate)
                : "Sem próxima data"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Tempo contratado</dt>
          <dd>{duration}</dd>
        </div>
        <div>
          <dt className="text-muted">Mídia + adicional</dt>
          <dd>{formatCurrency(Number(service.mediaBudget) + Number(service.additionalFee))}</dd>
        </div>
      </dl>
      {service.promotionalPrice !== null ? (
        <p className="service-note service-note--promo">
          <Icon className="size-4" name="sparkles" />
          {service.promotionalPrice === 0
            ? "Gratuito"
            : formatCurrency(service.promotionalPrice)}{" "}
          por {service.promotionalCycles} ciclos ·{" "}
          {remainingPromo ? `${remainingPromo} restante(s)` : "promoção concluída"}
        </p>
      ) : null}
      {service.nextAdjustmentDate ? (
        <p className="service-note">
          <Icon className="size-4" name="refresh" /> Revisar preço em{" "}
          {formatDatePtBr(service.nextAdjustmentDate)}
          {service.adjustmentRate !== null ? ` · sugestão de ${service.adjustmentRate}%` : ""}
        </p>
      ) : null}

      <div className="service-actions">
        {service.status !== "ended" ? (
          <Link
            className="service-action"
            href={`/cobrancas?clientId=${clientId}&serviceId=${service.id}`}
          >
            <Icon className="size-4" name="plus" /> Cobrança
          </Link>
        ) : null}
        {service.status !== "ended" ? (
          <button className="service-action" onClick={() => setEditing(true)} type="button">
            <Icon className="size-4" name="edit" /> Editar
          </button>
        ) : null}
        {service.status === "active" ? (
          <StateForm
            clientId={clientId}
            icon="pause"
            label="Pausar"
            serviceId={service.id}
            state="paused"
          />
        ) : null}
        {service.status !== "active" ? (
          <StateForm
            clientId={clientId}
            icon="play"
            label={service.status === "paused" ? "Retomar" : "Reativar"}
            serviceId={service.id}
            state="active"
          />
        ) : null}
        {service.status !== "ended" ? (
          <form action={setClientServiceState}>
            <input name="clientId" type="hidden" value={clientId} />
            <input name="id" type="hidden" value={service.id} />
            <input name="state" type="hidden" value="ended" />
            <ConfirmDialog
              className="service-action"
              confirmLabel="Encerrar serviço"
              confirmation="O serviço para de gerar cobranças de vez e sai do radar de alertas. O histórico e as cobranças já criadas continuam intactos. Se for uma parada temporária, use Pausar."
              icon="archive"
              label="Encerrar"
              title={`Encerrar ${service.name}`}
              tone="default"
            />
          </form>
        ) : null}
        <form action={deleteClientService}>
          <input name="clientId" type="hidden" value={clientId} />
          <input name="id" type="hidden" value={service.id} />
          <ConfirmDialog
            className="service-action service-action--danger"
            confirmLabel="Excluir serviço"
            confirmation="O serviço e suas cobranças ainda não pagas são removidos. Havendo qualquer cobrança já paga, a exclusão é bloqueada para preservar o histórico financeiro."
            icon="trash"
            label="Excluir"
            title={`Excluir ${service.name}`}
          />
        </form>
      </div>
    </article>
  );
}
