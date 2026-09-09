import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { deleteOperationalRecord, markChargePaid } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { clientEntityTypeLabel } from "@/features/clients/entity-schemas";
import { clientStatusInfo, isBillableClientStatus } from "@/features/clients/status";
import { ClientStatusChip } from "@/features/clients/status-chip";
import { formatCurrency, formatDatePtBr, isoDateInTimeZone } from "@/features/mvp/format";
import { type BillingFrequency } from "@/features/mvp/recurrence";
import { ownRevenue } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { archiveClient, deleteClient, restoreClient } from "../actions";
import { ClientStatusMessage } from "../status-message";
import { ChargeForm } from "./charge-form";
import { ConsolidateClientPanel } from "./consolidate-client-panel";
import { TransferClientPanel } from "./transfer-client-panel";
import { ClientEntityCard } from "./entity-card";
import { ClientEntityForm } from "./entity-form";
import { ServiceApplicationForm } from "./service-application-form";
import { ServiceCard } from "./service-card";
import { ClientStatusSwitcher } from "./status-switcher";

export const metadata: Metadata = { title: "Detalhes do cliente" };

const paymentMethods = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];
const paymentOptions = paymentMethods.map((method) => ({
  label: method,
  value: method,
}));

function serviceDuration(startDate: string, endedAt: string | null) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = endedAt ? new Date(endedAt) : new Date();
  const months = Math.max(
    0,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth(),
  );
  if (months < 1) return "Menos de 1 mês";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} ${years === 1 ? "ano" : "anos"}${rest ? ` e ${rest} ${rest === 1 ? "mês" : "meses"}` : ""}`;
}

export default async function ClientDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{
    action?: string;
    entity?: string;
    serviceId?: string;
    status?: string;
  }>;
}) {
  const [{ clientId: rawClientId }, parameters, context] = await Promise.all([
    params,
    searchParams,
    requireWorkspaceContext(),
  ]);
  const clientId = z.string().uuid().safeParse(rawClientId);
  if (!clientId.success) notFound();
  const defaultServiceId = z.string().uuid().safeParse(parameters.serviceId);
  const requestedEntityId = z.string().uuid().safeParse(parameters.entity);
  const openChargeForm = parameters.action === "new-charge" || defaultServiceId.success;
  const openServiceForm = parameters.action === "new-service";

  const [
    { data: client, error },
    { data: services, error: servicesError },
    { data: catalog, error: catalogError },
    { data: charges },
    { data: pendingCharges },
    { data: entityRows },
    { data: domainRows },
    { data: expenseRows },
    { data: otherClients },
  ] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, email, phone, website, commercial_status, notes, archived_at")
      .eq("id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .single(),
    context.supabase
      .from("client_services")
      .select(
        "id, name, description, list_price, discount_type, discount_value, company_revenue, media_budget, additional_fee, additional_fee_is_revenue, billing_type, installment_count, promotional_price, promotional_cycles, promotional_cycles_used, start_date, next_due_date, adjustment_interval_months, adjustment_rate, next_adjustment_date, ended_at, status, notes, client_entity_id",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("services")
      .select(
        "id, name, description, default_price, default_billing_type, default_adjustment_interval_months, default_adjustment_rate",
      )
      .eq("workspace_id", context.workspaceId)
      .eq("active", true)
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("charges")
      .select(
        "client_service_id, client_entity_id, company_revenue, additional_fee, additional_fee_is_revenue, status, due_date",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId),
    context.supabase
      .from("charges")
      .select(
        "id, description, due_date, company_revenue, media_budget, additional_fee, additional_fee_is_revenue, gross_total, status, client_entity_id",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(50),
    context.supabase
      .from("client_entities")
      .select(
        "id, display_name, entity_type, legal_name, tax_id, website, email, phone, notes, status, archived_at",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .order("display_name"),
    context.supabase
      .from("domains")
      .select("id, client_entity_id, status, cost")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId),
    context.supabase
      .from("expenses")
      .select("id, client_entity_id, status, amount")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId),
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .neq("id", clientId.data)
      .is("archived_at", null)
      .order("name")
      .limit(200),
  ]);
  if (error || servicesError || catalogError || !client) notFound();

  const statusInfo = clientStatusInfo(client.archived_at ? "archived" : client.commercial_status);
  const archived = Boolean(client.archived_at);
  const today = isoDateInTimeZone(context.workspaceTimezone);
  // O adicional declarado como receita entra aqui; como repasse, não (ADR-0018). Antes
  // ele ficava de fora dos dois casos, e o total do cliente nunca fechava com o painel.
  const earned = (charges ?? [])
    .filter((charge) => charge.status === "paid")
    .reduce((total, charge) => total + ownRevenue(charge), 0);
  const pending = (charges ?? [])
    .filter((charge) => charge.status === "pending")
    .reduce((total, charge) => total + ownRevenue(charge), 0);
  // O card de cada serviço precisa saber o que a exclusão levaria junto, então os totais
  // são agrupados por serviço aqui, uma vez, em vez de refiltrar dentro do componente.
  const chargeTotals = new Map<
    string,
    { paidCharges: number; paidRevenue: number; pendingCharges: number }
  >();
  for (const charge of charges ?? []) {
    if (!charge.client_service_id) continue;
    const totals = chargeTotals.get(charge.client_service_id) ?? {
      paidCharges: 0,
      paidRevenue: 0,
      pendingCharges: 0,
    };
    if (charge.status === "paid") {
      totals.paidCharges += 1;
      totals.paidRevenue += ownRevenue(charge);
    } else if (charge.status === "pending") {
      totals.pendingCharges += 1;
    }
    chargeTotals.set(charge.client_service_id, totals);
  }
  const emptyTotals = { paidCharges: 0, paidRevenue: 0, pendingCharges: 0 };
  const catalogOptions = (catalog ?? []).map((service) => ({
    adjustmentIntervalMonths: service.default_adjustment_interval_months,
    adjustmentRate:
      service.default_adjustment_rate === null ? null : Number(service.default_adjustment_rate),
    billingType: service.default_billing_type as BillingFrequency,
    defaultPrice: Number(service.default_price),
    description: service.description,
    id: service.id,
    name: service.name,
  }));
  const clientReturnTo = `/clientes/${client.id}`;
  const chargeServices = (services ?? [])
    .filter((service) => service.status !== "ended")
    .map((service) => ({ id: service.id, name: service.name }));

  // Empresas/marcas do cliente (ADR-0020). Os totais de cada card são derivados das
  // mesmas listas já carregadas acima; nada aqui pede uma consulta por entidade.
  const entities = (entityRows ?? []).map((entity) => {
    const archived = Boolean(entity.archived_at) || entity.status === "archived";
    const entityCharges = (charges ?? []).filter((charge) => charge.client_entity_id === entity.id);
    return {
      activeDomains: (domainRows ?? []).filter(
        (domain) => domain.client_entity_id === entity.id && domain.status === "active",
      ).length,
      activeServices: (services ?? []).filter(
        (service) => service.client_entity_id === entity.id && service.status === "active",
      ).length,
      archived,
      displayName: entity.display_name,
      email: entity.email,
      entityType: entity.entity_type,
      id: entity.id,
      legalName: entity.legal_name,
      notes: entity.notes,
      paidRevenue: entityCharges
        .filter((charge) => charge.status === "paid")
        .reduce((total, charge) => total + ownRevenue(charge), 0),
      pendingCharges: entityCharges.filter((charge) => charge.status === "pending").length,
      phone: entity.phone,
      taxId: entity.tax_id,
      website: entity.website,
    };
  });
  const activeEntities = entities.filter((entity) => !entity.archived);
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.displayName]));
  const entityOptions = activeEntities.map((entity) => ({
    clientId: client.id,
    id: entity.id,
    name: entity.displayName,
    typeLabel: clientEntityTypeLabel(entity.entityType),
  }));
  // `?entity=` recorta a ficha sem esconder os totais consolidados do topo.
  const focusedEntityId =
    requestedEntityId.success && entityNames.has(requestedEntityId.data)
      ? requestedEntityId.data
      : null;
  const visibleServices = focusedEntityId
    ? (services ?? []).filter((service) => service.client_entity_id === focusedEntityId)
    : (services ?? []);
  const visiblePendingCharges = focusedEntityId
    ? (pendingCharges ?? []).filter((charge) => charge.client_entity_id === focusedEntityId)
    : (pendingCharges ?? []);
  const focusedExpenses = focusedEntityId
    ? (expenseRows ?? []).filter((expense) => expense.client_entity_id === focusedEntityId)
    : [];
  const focusedDomains = focusedEntityId
    ? (domainRows ?? []).filter((domain) => domain.client_entity_id === focusedEntityId)
    : [];
  const consolidationClients = (otherClients ?? []).map((entry) => ({
    id: entry.id,
    name: entry.name,
    status: entry.commercial_status,
    tradeName: entry.trade_name,
  }));

  return (
    <AccountShell
      description="Dados do cliente, serviços contratados e atalhos para a operação financeira."
      title={client.name}
    >
      <ClientStatusMessage status={parameters.status} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="font-semibold hover:underline" href="/clientes">
          ← Voltar
        </Link>
        <div className="flex flex-wrap gap-3">
          {!archived && isBillableClientStatus(client.commercial_status) ? (
            <Link
              className="bg-brand text-brand-contrast rounded-xl px-4 py-2 font-semibold"
              href={`/clientes/${client.id}?action=new-service#servicos`}
            >
              Novo serviço
            </Link>
          ) : null}
          <Link
            className="border-line rounded-xl border px-4 py-2 font-semibold"
            href={`/clientes/${client.id}/editar`}
          >
            Editar cliente
          </Link>
        </div>
      </div>

      {archived ? (
        <section className="panel-card mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
            <ClientStatusChip status="archived" />
            <span>
              O histórico está preservado, mas ele não aparece na operação do dia a dia.
            </span>
          </p>
          <form action={restoreClient}>
            <input name="clientId" type="hidden" value={client.id} />
            <button className="primary-action" type="submit">
              Desarquivar cliente
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="section-heading">
            <span className="section-heading__icon bg-brand-soft text-brand-strong">
              <Icon name="user" />
            </span>
            <div>
              <h2>Dados do cliente</h2>
              <p>{statusInfo.description}</p>
            </div>
          </div>
          {archived ? (
            <span className={statusInfo.className}>
              <Icon className="size-3.5" name={statusInfo.icon} /> {statusInfo.label}
            </span>
          ) : (
            <ClientStatusSwitcher clientId={client.id} status={client.commercial_status} />
          )}
        </div>
        <dl className="client-detail-grid">
          {client.trade_name ? (
            <div>
              <dt>Empresa</dt>
              <dd>{client.trade_name}</dd>
            </div>
          ) : null}
          {client.email ? (
            <div>
              <dt>E-mail</dt>
              <dd>
                <a className="client-detail-link" href={`mailto:${client.email}`}>
                  {client.email}
                </a>
              </dd>
            </div>
          ) : null}
          {client.phone ? (
            <div>
              <dt>Telefone</dt>
              <dd>
                <a
                  className="client-detail-link"
                  href={`tel:${client.phone.replace(/[^+\d]/g, "")}`}
                >
                  {client.phone}
                </a>
              </dd>
            </div>
          ) : null}
          {client.website ? (
            <div>
              <dt>Site</dt>
              <dd>
                <a
                  className="client-detail-link"
                  href={`https://${client.website}`}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {client.website} <Icon className="size-3.5" name="link" />
                </a>
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Já recebido</dt>
            <dd className="text-positive font-black">{formatCurrency(earned)}</dd>
          </div>
          {pending > 0 ? (
            <div>
              <dt>A receber</dt>
              <dd className="font-black">{formatCurrency(pending)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="panel-card mt-4" id="empresas">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="section-heading">
            <span className="section-heading__icon bg-violet-soft text-violet">
              <Icon name="building" />
            </span>
            <div>
              <h2>Empresas e marcas</h2>
              <p>
                Separe as frentes deste cliente sem duplicar o cadastro. O vínculo é opcional: o que
                não tem empresa continua valendo como geral.
              </p>
            </div>
          </div>
          {activeEntities.length ? (
            <span className="entity-chip">
              {activeEntities.length} {activeEntities.length === 1 ? "ativa" : "ativas"}
            </span>
          ) : null}
        </div>

        {focusedEntityId ? (
          <aside className="helper-note mt-4" role="status">
            <Icon className="size-4" name="filter" />
            <span>
              Mostrando serviços e cobranças de <strong>{entityNames.get(focusedEntityId)}</strong>.{" "}
              <Link className="font-semibold hover:underline" href={`/clientes/${client.id}`}>
                Ver o cliente inteiro
              </Link>
            </span>
          </aside>
        ) : null}

        {focusedEntityId ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              className="helper-note"
              href={`/cobrancas?clientId=${client.id}&entity=${focusedEntityId}`}
            >
              <Icon className="size-4" name="receipt" /> Cobranças desta empresa
            </Link>
            <Link
              className="helper-note"
              href={`/despesas?clientId=${client.id}&entity=${focusedEntityId}`}
            >
              <Icon className="size-4" name="wallet" /> {focusedExpenses.length} despesa(s) ·{" "}
              {formatCurrency(
                focusedExpenses.reduce((total, item) => total + Number(item.amount), 0),
              )}
            </Link>
            <Link
              className="helper-note"
              href={`/dominios?clientId=${client.id}&entity=${focusedEntityId}`}
            >
              <Icon className="size-4" name="globe" /> {focusedDomains.length} domínio(s)
            </Link>
          </div>
        ) : null}

        {entities.length ? (
          <div className="entity-grid mt-4">
            {entities.map((entity) => (
              <ClientEntityCard
                clientId={client.id}
                entity={entity}
                key={entity.id}
                readOnly={archived}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted mt-4 text-sm">
            Nenhuma empresa ou marca cadastrada. Crie uma quando o cliente tiver mais de um negócio
            sob o mesmo contrato.
          </p>
        )}

        {!archived ? (
          <details className="form-disclosure border-line mt-5 border-t pt-5">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              <span className="flex items-center gap-2">
                <Icon className="size-4" name="plus" /> Nova empresa/marca
              </span>
              <span className="text-muted flex items-center gap-1 text-xs">
                <span className="form-disclosure__closed-label">Abrir formulário</span>
                <span className="form-disclosure__open-label">Fechar formulário</span>
                <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
              </span>
            </summary>
            <ClientEntityForm clientId={client.id} />
          </details>
        ) : null}
      </section>

      {client.notes ? (
        <section className="panel-card mt-4" id="observacoes">
          <div className="section-heading mb-3">
            <span className="section-heading__icon bg-warning-soft text-warning">
              <Icon name="info" />
            </span>
            <div>
              <h2>Observações</h2>
              <p>Anotações que você registrou sobre este cliente.</p>
            </div>
          </div>
          <p className="client-notes">{client.notes}</p>
        </section>
      ) : null}

      <section className="panel-card mt-4" id="servicos">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-violet-soft text-violet">
            <Icon name="briefcase" />
          </span>
          <div>
            <h2>Serviços</h2>
            <p>
              Fluxo principal: ao aplicar um serviço, a cobrança correspondente é criada
              automaticamente.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleServices.length ? (
            visibleServices.map((service) => (
              <ServiceCard
                catalog={catalogOptions}
                clientId={client.id}
                duration={serviceDuration(service.start_date, service.ended_at)}
                entityName={
                  service.client_entity_id
                    ? (entityNames.get(service.client_entity_id) ?? null)
                    : null
                }
                key={service.id}
                service={{
                  additionalFee: Number(service.additional_fee),
                  additionalFeeIsRevenue: service.additional_fee_is_revenue,
                  adjustmentIntervalMonths: service.adjustment_interval_months,
                  adjustmentRate:
                    service.adjustment_rate === null ? null : Number(service.adjustment_rate),
                  billingType: service.billing_type as BillingFrequency,
                  description: service.description,
                  discountType: service.discount_type as "fixed" | "none" | "percentage",
                  discountValue: Number(service.discount_value),
                  id: service.id,
                  installmentCount: service.installment_count,
                  listPrice: Number(service.list_price),
                  mediaBudget: Number(service.media_budget),
                  name: service.name,
                  nextAdjustmentDate: service.next_adjustment_date,
                  nextDueDate: service.next_due_date,
                  notes: service.notes,
                  ...(chargeTotals.get(service.id) ?? emptyTotals),
                  promotionalCycles: service.promotional_cycles,
                  promotionalCyclesUsed: service.promotional_cycles_used,
                  promotionalPrice:
                    service.promotional_price === null ? null : Number(service.promotional_price),
                  startDate: service.start_date,
                  status: service.status,
                }}
              />
            ))
          ) : (
            <p className="text-muted text-sm">
              {focusedEntityId
                ? "Nenhum serviço nesta empresa/marca."
                : "Nenhum serviço adicionado. Comece por aqui para gerar cobranças recorrentes."}
            </p>
          )}
        </div>

        {isBillableClientStatus(client.commercial_status) && !archived ? (
          <details
            className="form-disclosure border-line mt-6 border-t pt-5"
            id="adicionar-servico"
            open={openServiceForm}
          >
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              <span className="flex items-center gap-2">
                <Icon className="size-4" name="plus" /> Adicionar serviço
              </span>
              <span className="text-muted flex items-center gap-1 text-xs">
                <span className="form-disclosure__closed-label">Abrir formulário</span>
                <span className="form-disclosure__open-label">Fechar formulário</span>
                <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
              </span>
            </summary>
            <div className="mt-4">
              <ServiceApplicationForm
                catalog={catalogOptions}
                clientId={client.id}
                defaultEntityId={focusedEntityId ?? undefined}
                entities={entityOptions}
              />
            </div>
          </details>
        ) : (
          <p className="helper-note mt-5">
            <Icon className="size-4" name="info" />
            {archived ? (
              "Desarquive o cliente para voltar a aplicar serviços."
            ) : (
              <span>
                Clientes em <ClientStatusChip status={client.commercial_status} /> não recebem novos
                serviços. Mude a situação comercial para continuar.
              </span>
            )}
          </p>
        )}
      </section>

      {visiblePendingCharges.length ? (
        <section className="panel-card mt-4" id="cobrancas-pendentes">
          <div className="section-heading mb-4">
            <span className="section-heading__icon bg-warning-soft text-warning">
              <Icon name="wallet" />
            </span>
            <div>
              <h2>Cobranças pendentes</h2>
              <p>Receba aqui sem sair da ficha do cliente.</p>
            </div>
          </div>
          <div className="charge-list">
            {visiblePendingCharges.map((charge) => {
              const overdue = charge.due_date < today;
              const chargeEntity = charge.client_entity_id
                ? entityNames.get(charge.client_entity_id)
                : null;
              return (
                <article
                  className={`charge-card ${overdue ? "critical-card" : ""}`}
                  key={charge.id}
                >
                  <div className="charge-card__head">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{charge.description}</h3>
                      <p className="text-muted text-sm">
                        {chargeEntity ? `${chargeEntity} · ` : ""}
                        Vencimento {formatDatePtBr(charge.due_date)}
                        {overdue ? " · vencida" : ""}
                      </p>
                    </div>
                    <span
                      className={`charge-status charge-status--${overdue ? "overdue" : "pending"}`}
                    >
                      {overdue ? "Vencida" : "Pendente"}
                    </span>
                  </div>
                  <dl className="charge-card__values">
                    <div>
                      <dt>Receita própria</dt>
                      <dd>{formatCurrency(charge.company_revenue)}</dd>
                    </div>
                    <div>
                      <dt>Total bruto</dt>
                      <dd className="font-black">{formatCurrency(charge.gross_total)}</dd>
                    </div>
                  </dl>
                  <div className="charge-card__actions">
                    <form action={markChargePaid} className="charge-settle">
                      <input name="id" type="hidden" value={charge.id} />
                      <input name="returnTo" type="hidden" value={clientReturnTo} />
                      <SelectField
                        defaultValue="Pix"
                        label="Forma de pagamento"
                        name="paymentMethod"
                        options={paymentOptions}
                      />
                      <SubmitButton idleLabel="Marcar como paga" pendingLabel="Registrando…" />
                    </form>
                    <form action={deleteOperationalRecord}>
                      <input name="clientId" type="hidden" value={client.id} />
                      <input name="id" type="hidden" value={charge.id} />
                      <input name="recordType" type="hidden" value="charge" />
                      <ConfirmDialog
                        className="charge-action charge-action--danger"
                        confirmLabel="Excluir cobrança"
                        confirmation="A cobrança some do sistema sem deixar registro. Se ela existiu de verdade, prefira cancelar na página de cobranças."
                        icon="trash"
                        label="Excluir"
                        title={charge.description}
                      />
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="text-muted mt-3 text-sm">
            <Link
              className="font-semibold hover:underline"
              href={`/cobrancas?clientId=${client.id}`}
            >
              Ver todas as cobranças deste cliente →
            </Link>
          </p>
        </section>
      ) : null}

      {!archived ? (
        <section className="panel-card mt-4" id="cobranca-avulsa">
          <details className="form-disclosure" open={openChargeForm}>
            <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
              <span className="flex items-center gap-2">
                <span className="bg-warning-soft text-warning grid size-9 place-items-center rounded-xl">
                  <Icon className="size-4" name="plus" />
                </span>
                Nova cobrança avulsa
              </span>
              <span className="text-muted flex items-center gap-1 text-xs">
                <span className="form-disclosure__closed-label">Abrir formulário</span>
                <span className="form-disclosure__open-label">Fechar formulário</span>
                <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
              </span>
            </summary>
            <p className="helper-note mt-3">
              <Icon className="size-4" name="info" /> Use para cobranças fora de um serviço. Para
              mensalidades, projetos parcelados ou serviços recorrentes, prefira adicionar um
              serviço.
            </p>
            {isBillableClientStatus(client.commercial_status) ? (
              <p className="mt-2 text-sm">
                <Link
                  className="text-brand-strong font-semibold hover:underline"
                  href={`/clientes/${client.id}?action=new-service#servicos`}
                >
                  Adicionar serviço em vez disso →
                </Link>
              </p>
            ) : (
              <p className="helper-note mt-3">
                <Icon className="size-4" name="info" />
                <span>
                  Cliente em <ClientStatusChip status={client.commercial_status} />: a cobrança
                  avulsa ainda funciona, mas novos serviços ficam bloqueados até mudar a situação
                  comercial.
                </span>
              </p>
            )}
            <ChargeForm
              clientId={client.id}
              defaultEntityId={focusedEntityId ?? undefined}
              defaultServiceId={defaultServiceId.success ? defaultServiceId.data : undefined}
              entities={entityOptions}
              returnTo={clientReturnTo}
              services={chargeServices}
            />
          </details>
        </section>
      ) : null}

      {!archived ? (
        <details className="danger-zone form-disclosure mt-8">
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-muted flex items-center gap-2 text-sm font-bold">
              <Icon className="size-4" name="settings" /> Opções avançadas deste cliente
            </span>
            <span className="text-muted flex items-center gap-1 text-xs">
              <span className="form-disclosure__closed-label">Ver</span>
              <span className="form-disclosure__open-label">Fechar</span>
              <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
            </span>
          </summary>
          <div className="mt-4 grid gap-4">
            <TransferClientPanel
              clients={consolidationClients}
              sourceClientId={client.id}
              sourceClientName={client.name}
            />
            <div className="border-line border-t pt-4">
              <ConsolidateClientPanel
                clients={consolidationClients}
                targetClientId={client.id}
                targetClientName={client.name}
              />
            </div>
            <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted max-w-2xl text-sm">
                <strong className="text-foreground">Arquivar</strong> tira o cliente da operação
                diária e preserva tudo: serviços, cobranças e histórico. É a saída recomendada
                quando o relacionamento acabou.
              </p>
              <form action={archiveClient}>
                <input name="clientId" type="hidden" value={client.id} />
                <ConfirmDialog
                  className="border-line bg-surface min-h-11 rounded-xl border-2 px-4 font-bold"
                  confirmLabel="Arquivar cliente"
                  confirmation="O cliente sai das listas do dia a dia e para de gerar alertas. Você pode desarquivar quando quiser, sem perder nada."
                  icon="archive"
                  label="Arquivar cliente"
                  title={`Arquivar ${client.name}`}
                  tone="default"
                />
              </form>
            </div>
            <div className="border-line flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted max-w-2xl text-sm">
                <strong className="text-negative">Excluir</strong> apaga o cadastro para sempre. Só
                funciona para clientes sem serviços, cobranças, despesas ou domínios. Havendo
                histórico, arquive em vez de excluir.
              </p>
              <form action={deleteClient}>
                <input name="clientId" type="hidden" value={client.id} />
                <ConfirmDialog
                  className="danger-action"
                  confirmLabel="Excluir cliente"
                  confirmation={`${client.name} sai do sistema para sempre, junto com os contatos cadastrados. Não há como desfazer.`}
                  icon="trash"
                  label="Excluir definitivamente"
                  requiredPhrase={client.name}
                  title="Excluir cliente definitivamente"
                />
              </form>
            </div>
          </div>
        </details>
      ) : null}
    </AccountShell>
  );
}
