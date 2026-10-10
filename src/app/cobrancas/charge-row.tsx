import Link from "next/link";

import { deleteOperationalRecord, deletePaidFinancialRecord } from "@/app/_actions/mvp";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FiscalDocumentPanel,
  type FiscalDocumentItem,
} from "@/components/ui/fiscal-document-panel";
import { Icon } from "@/components/ui/icon";
import { RecordCell, RecordRow, type RecordTone } from "@/components/ui/record-row";
import { daysBetween, formatCurrency, formatDatePtBr } from "@/features/mvp/format";
import { cancellationReasons, ownRevenue } from "@/features/mvp/schemas";

import { CancelChargeForm } from "./cancel-charge-form";
import { DelayReasonForm } from "./delay-reason-form";
import { SettleChargeButton } from "./settle-charge-button";

const cancellationLabels = new Map<string, string>(cancellationReasons.map(([v, l]) => [v, l]));

const statusLabels = {
  cancelled: "Cancelada",
  overdue: "Vencida",
  paid: "Paga",
  pending: "Pendente",
} as const;

const tones: Record<keyof typeof statusLabels, RecordTone> = {
  cancelled: "muted",
  overdue: "danger",
  paid: "positive",
  pending: "warning",
};

/** Colunas da lista de cobranças em tela larga; a lista e as linhas usam a mesma medida. */
export const chargeListColumns = "minmax(0, 1fr) 7.5rem 6.25rem 9rem 5.5rem 1rem";
export const chargeListLabels = ["Cobrança", "Vencimento", "Situação", "Valor", "", ""];

export type ChargeRowData = {
  additionalFee: number | string;
  additionalFeeIsRevenue: boolean;
  cancelReason?: string | null;
  cancelReasonCode?: string | null;
  clientId: string;
  clientName?: string | null;
  companyRevenue: number | string;
  delayReason?: string | null;
  description: string;
  documents?: FiscalDocumentItem[];
  dueDate: string;
  entityName?: string | null;
  grossTotal: number | string | null;
  id: string;
  mediaBudget: number | string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  status: string;
};

/**
 * Uma cobrança em uma linha: o essencial à vista e a ação principal a um clique. O que é
 * consulta ou correção (composição do valor, motivo do atraso, nota fiscal, cancelar e
 * excluir) fica nos detalhes, que abrem ao clicar na linha.
 */
export function ChargeRow({
  charge,
  anchorPrefix = "charge",
  context = "list",
  defaultOpen = false,
  headingLevel = 2,
  returnTo,
  today,
}: {
  charge: ChargeRowData;
  /** Na ficha do cliente o nome dele é redundante e a exclusão volta para a ficha. */
  /** Prefixo do id da linha, para a mesma cobrança poder aparecer em duas listas da página. */
  anchorPrefix?: string;
  context?: "client" | "history" | "list";
  defaultOpen?: boolean;
  headingLevel?: 2 | 3;
  returnTo: string;
  today: string;
}) {
  const status =
    charge.status === "pending" && charge.dueDate < today
      ? "overdue"
      : charge.status in statusLabels
        ? (charge.status as keyof typeof statusLabels)
        : "pending";
  const gross = Number(charge.grossTotal ?? 0);
  const revenue = ownRevenue({
    additional_fee: charge.additionalFee,
    additional_fee_is_revenue: charge.additionalFeeIsRevenue,
    company_revenue: charge.companyRevenue,
  });
  const owner =
    context !== "list"
      ? (charge.entityName ?? null)
      : [charge.clientName ?? "Cliente", charge.entityName].filter(Boolean).join(" · ");
  const lateDays = status === "overdue" ? daysBetween(charge.dueDate, today) : 0;
  const amountLabel = gross === 0 ? "Cortesia" : formatCurrency(gross);

  return (
    <RecordRow
      amount={amountLabel}
      amountNote={gross !== revenue ? `receita ${formatCurrency(revenue)}` : undefined}
      cells={
        <RecordCell
          label="Vencimento"
          note={lateDays > 0 ? `há ${lateDays} ${lateDays === 1 ? "dia" : "dias"}` : undefined}
        >
          {formatDatePtBr(charge.dueDate)}
        </RecordCell>
      }
      defaultOpen={defaultOpen}
      headingLevel={headingLevel}
      id={`${anchorPrefix}-${charge.id}`}
      quickAction={
        charge.status === "pending" && context !== "history" ? (
          <SettleChargeButton
            amountLabel={amountLabel}
            chargeId={charge.id}
            description={charge.description}
            returnTo={returnTo}
          />
        ) : null
      }
      status={
        <span className={`charge-status charge-status--${status}`}>{statusLabels[status]}</span>
      }
      subtitle={owner}
      title={charge.description}
      tone={tones[status]}
    >
      <dl className="record-facts">
        <div>
          <dt>Receita própria</dt>
          <dd>{formatCurrency(charge.companyRevenue)}</dd>
        </div>
        <div>
          <dt>Verba de mídia</dt>
          <dd>{formatCurrency(charge.mediaBudget)}</dd>
        </div>
        <div>
          <dt>
            Adicional
            {Number(charge.additionalFee) > 0 && !charge.additionalFeeIsRevenue ? " (repasse)" : ""}
          </dt>
          <dd>{formatCurrency(charge.additionalFee)}</dd>
        </div>
        <div>
          <dt>Total bruto</dt>
          <dd className="font-black">{amountLabel}</dd>
        </div>
        {charge.paidAt ? (
          <div>
            <dt>Pagamento</dt>
            <dd>
              {formatDatePtBr(charge.paidAt)}
              {charge.paymentMethod ? ` · ${charge.paymentMethod}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>

      {status === "overdue" ? (
        charge.delayReason ? (
          <div className="delay-reason-note">
            <Icon className="size-4" name="history" />
            <span>
              <strong>Motivo registrado:</strong> {charge.delayReason}
            </span>
          </div>
        ) : (
          <DelayReasonForm chargeId={charge.id} />
        )
      ) : null}

      {charge.status === "cancelled" && charge.cancelReason ? (
        <div className="delay-reason-note">
          <Icon className="size-4" name="x" />
          <span>
            <strong>{cancellationLabels.get(charge.cancelReasonCode ?? "") ?? "Cancelada"}:</strong>{" "}
            {charge.cancelReason}
          </span>
        </div>
      ) : null}

      {charge.status === "paid" ? (
        <FiscalDocumentPanel
          documents={charge.documents ?? []}
          entityId={charge.id}
          entityType="charge"
        />
      ) : null}

      <div className="record-actions">
        {context === "list" ? (
          <Link className="service-action" href={`/clientes/${charge.clientId}`}>
            <Icon className="size-4" name="user" /> Ver cliente
          </Link>
        ) : (
          <Link className="service-action" href={`/cobrancas?focus=${charge.id}`}>
            <Icon className="size-4" name="receipt" /> Ver em Cobranças
          </Link>
        )}
        {charge.status === "pending" && context === "list" ? (
          <CancelChargeForm chargeId={charge.id} description={charge.description} />
        ) : null}
        {charge.status === "paid" ? (
          <form action={deletePaidFinancialRecord}>
            <input name="id" type="hidden" value={charge.id} />
            <input name="recordType" type="hidden" value="charge" />
            <input name="returnTo" type="hidden" value={returnTo} />
            <ConfirmDialog
              className="service-action service-action--danger"
              confirmLabel="Excluir cobrança paga"
              confirmation="A receita sai do dashboard e do histórico. Notas fiscais anexadas são removidas. Esta ação é irreversível."
              holdSeconds={3}
              icon="trash"
              label="Excluir paga"
              title={charge.description}
              triggerIcon="trash"
            />
          </form>
        ) : (
          <form action={deleteOperationalRecord}>
            <input
              name="clientId"
              type="hidden"
              value={context === "list" ? "" : charge.clientId}
            />
            <input name="id" type="hidden" value={charge.id} />
            <input name="recordType" type="hidden" value="charge" />
            <ConfirmDialog
              className="service-action service-action--danger"
              confirmLabel="Excluir cobrança"
              confirmation={
                charge.status === "cancelled"
                  ? "A cobrança cancelada some do sistema sem deixar registro."
                  : "A cobrança some do sistema sem deixar registro. Se ela existiu de verdade, prefira cancelar para manter o histórico."
              }
              icon="trash"
              label="Excluir"
              title={charge.description}
              triggerIcon="trash"
            />
          </form>
        )}
      </div>
    </RecordRow>
  );
}
