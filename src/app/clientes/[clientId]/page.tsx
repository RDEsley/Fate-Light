import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { ChargeRow, chargeListColumns, chargeListLabels } from "@/app/cobrancas/charge-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormPanel } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { OpenPanelLink } from "@/components/ui/open-panel-link";
import { RecordList } from "@/components/ui/record-row";
import { clientEntityTypeLabel } from "@/features/clients/entity-schemas";
import { clientStatusInfo, isBillableClientStatus } from "@/features/clients/status";
import { ClientStatusChip } from "@/features/clients/status-chip";
import { formatCurrency, isoDateInTimeZone } from "@/features/mvp/format";
import { type BillingFrequency } from "@/features/mvp/recurrence";
import { ownRevenue } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { archiveClient, deleteClient, restoreClient } from "../actions";
import { ClientStatusMessage } from "../status-message";
import { ChargeForm } from "./charge-form";
import { ConsolidateClientPanel } from "./consolidate-client-panel";
import { TransferClientPanel } from "./transfer-client-panel";
import { ServiceApplicationForm } from "./service-application-form";
import { ServiceCard } from "./service-card";
import { ClientStatusSwitcher } from "./status-switcher";

export const metadata: Metadata = { title: "Detalhes do cliente" };

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
      .select("id, display_name, entity_type, status, archived_at")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .order("display_name"),
    context.supabase
      .from("domains")
      .select("id, client_entity_id")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId),
    context.supabase
      .from("expenses")
      .select("id, client_entity_id, amount")
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
  const billable = isBillableClientStatus(client.commercial_status) && !archived;
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

  // Empresas/marcas do cliente (ADR-0020). O cadastro delas mora na edição do cliente;
  // aqui elas servem para recortar a ficha e para vincular novos lançamentos.
  const entities = entityRows ?? [];
  const activeEntities = entities.filter(
    (entity) => !entity.archived_at && entity.status !== "archived",
  );
  const entityNames = new Map(entities.map((entity) => [entity.id, entity.display_name]));
  const entityOptions = activeEntities.map((entity) => ({
    clientId: client.id,
    id: entity.id,
    name: entity.display_name,
    typeLabel: clientEntityTypeLabel(entity.entity_type),
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
      description="Serviços contratados, cobranças e o que este cliente já rendeu."
      title={client.name}
    >
      <ClientStatusMessage status={parameters.status} />
      <div className="page-toolbar">
        <Link className="button button--ghost button--small" href="/clientes">
          <Icon className="size-4" name="arrow-left" /> Clientes
        </Link>
        <div className="page-toolbar__actions">
          {archived ? null : (
            <Link className="button button--secondary" href={`/clientes/${client.id}/editar`}>
              <Icon className="size-4" name="edit" /> Editar cliente
            </Link>
          )}
          {billable ? (
            <OpenPanelLink
              className="button button--primary"
              href={`/clientes/${client.id}?action=new-service#adicionar-servico`}
              panelId="adicionar-servico"
            >
              <Icon className="size-4" name="plus" /> Adicionar serviço
            </OpenPanelLink>
          ) : null}
        </div>
      </div>

      {archived ? (
        <section className="panel-card mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted flex flex-wrap items-center gap-2 text-sm">
            <ClientStatusChip status="archived" />
            <span>O histórico está preservado, mas ele não aparece na operação do dia a dia.</span>
          </p>
          <form action={restoreClient}>
            <input name="clientId" type="hidden" value={client.id} />
            <button className="button button--primary" type="submit">
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

        <div className="client-overview">
          <dl className="client-kpis">
            <div className="client-kpi client-kpi--positive">
              <dt>Já recebido</dt>
              <dd>{formatCurrency(earned)}</dd>
            </div>
            <div className="client-kpi">
              <dt>A receber</dt>
              <dd>{formatCurrency(pending)}</dd>
            </div>
          </dl>
          {client.trade_name || client.email || client.phone || client.website ? (
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
            </dl>
          ) : (
            <p className="text-muted self-center text-sm">
              Sem contato cadastrado.{" "}
              {archived ? null : (
                <Link
                  className="text-brand-strong font-semibold hover:underline"
                  href={`/clientes/${client.id}/editar`}
                >
                  Completar cadastro
                </Link>
              )}
            </p>
          )}
        </div>

        {entities.length ? (
          <div className="entity-filter" id="empresas">
            <span className="entity-filter__label">
              <Icon className="size-4" name="building" /> Empresas e marcas
            </span>
            <nav aria-label="Filtrar a ficha por empresa ou marca" className="entity-filter__chips">
              <Link
                aria-current={focusedEntityId ? undefined : "true"}
                href={`/clientes/${client.id}`}
              >
                Tudo
              </Link>
              {activeEntities.map((entity) => (
                <Link
                  aria-current={focusedEntityId === entity.id ? "true" : undefined}
                  href={`/clientes/${client.id}?entity=${entity.id}`}
                  key={entity.id}
                >
                  {entity.display_name}
                </Link>
              ))}
            </nav>
            {archived ? null : (
              <Link
                className="entity-filter__manage"
                href={`/clientes/${client.id}/editar#empresas`}
              >
                Gerenciar
              </Link>
            )}
          </div>
        ) : null}

        {focusedEntityId ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3" role="status">
            <Link
              className="helper-note"
              href={`/cobrancas?clientId=${client.id}&entity=${focusedEntityId}`}
            >
              <Icon className="size-4" name="receipt" /> Cobranças de{" "}
              {entityNames.get(focusedEntityId)}
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
            <p>Ao aplicar um serviço, a cobrança correspondente é criada automaticamente.</p>
          </div>
        </div>

        {billable ? (
          <FormPanel
            defaultOpen={openServiceForm}
            description="Do catálogo ou personalizado para este cliente"
            id="adicionar-servico"
            title="Adicionar serviço"
          >
            <ServiceApplicationForm
              catalog={catalogOptions}
              clientId={client.id}
              defaultEntityId={focusedEntityId ?? undefined}
              entities={entityOptions}
            />
          </FormPanel>
        ) : (
          <p className="helper-note">
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

        {visibleServices.length ? (
          <div className="service-grid mt-4">
            {visibleServices.map((service) => (
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
            ))}
          </div>
        ) : (
          <div className="empty-state mt-4">
            <span className="empty-state__icon">
              <Icon name="briefcase" />
            </span>
            <strong>
              {focusedEntityId ? "Nenhum serviço nesta empresa/marca" : "Nenhum serviço ainda"}
            </strong>
            <p>
              {focusedEntityId
                ? "Os serviços vinculados a ela aparecem aqui."
                : "Adicione o primeiro para começar a gerar cobranças."}
            </p>
          </div>
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
          <RecordList columns={chargeListColumns} head={chargeListLabels}>
            {visiblePendingCharges.map((charge) => (
              <ChargeRow
                charge={{
                  additionalFee: charge.additional_fee,
                  additionalFeeIsRevenue: charge.additional_fee_is_revenue,
                  clientId: client.id,
                  companyRevenue: charge.company_revenue,
                  description: charge.description,
                  dueDate: charge.due_date,
                  entityName: charge.client_entity_id
                    ? entityNames.get(charge.client_entity_id)
                    : null,
                  grossTotal: charge.gross_total,
                  id: charge.id,
                  mediaBudget: charge.media_budget,
                  status: charge.status,
                }}
                context="client"
                headingLevel={3}
                key={charge.id}
                returnTo={clientReturnTo}
                today={today}
              />
            ))}
          </RecordList>
          <p className="text-muted mt-3 text-sm">
            <Link
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              href={`/cobrancas?clientId=${client.id}`}
            >
              Ver todas as cobranças deste cliente{" "}
              <Icon className="size-3.5" name="chevron-right" />
            </Link>
          </p>
        </section>
      ) : null}

      {!archived ? (
        <section className="mt-4" id="cobranca-avulsa">
          <FormPanel
            defaultOpen={openChargeForm}
            description="Para um valor fora dos serviços contratados"
            icon="receipt"
            id="nova-cobranca-avulsa"
            title="Nova cobrança avulsa"
            tone="warning"
          >
            {billable ? null : (
              <p className="helper-note mb-4">
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
          </FormPanel>
        </section>
      ) : null}

      {!archived ? (
        <section className="mt-4">
          <FormPanel
            description="Transferir, consolidar, arquivar ou excluir este cliente"
            icon="settings"
            title="Opções avançadas do cliente"
          >
            <div className="action-list">
              <details className="action-row">
                <summary className="action-row__head">
                  <span className="action-row__icon">
                    <Icon className="size-4" name="swap" />
                  </span>
                  <span className="action-row__text">
                    <strong>Transferir dados para outro cliente</strong>
                    <small>
                      Move serviços, cobranças, despesas, domínios, contatos e empresas/marcas.
                    </small>
                  </span>
                  <Icon className="action-row__chevron size-4" name="chevron-down" />
                </summary>
                <div className="action-row__body">
                  <TransferClientPanel
                    clients={consolidationClients}
                    sourceClientId={client.id}
                    sourceClientName={client.name}
                  />
                </div>
              </details>
              <details className="action-row">
                <summary className="action-row__head">
                  <span className="action-row__icon">
                    <Icon className="size-4" name="merge" />
                  </span>
                  <span className="action-row__text">
                    <strong>Consolidar outro cliente aqui</strong>
                    <small>Transforma um cadastro antigo em empresa/marca de {client.name}.</small>
                  </span>
                  <Icon className="action-row__chevron size-4" name="chevron-down" />
                </summary>
                <div className="action-row__body">
                  <ConsolidateClientPanel
                    clients={consolidationClients}
                    targetClientId={client.id}
                    targetClientName={client.name}
                  />
                </div>
              </details>
              <div className="action-row">
                <div className="action-row__head">
                  <span className="action-row__icon">
                    <Icon className="size-4" name="archive" />
                  </span>
                  <span className="action-row__text">
                    <strong>Arquivar cliente</strong>
                    <small>
                      Sai da operação diária e preserva serviços, cobranças e histórico. É a saída
                      recomendada quando o relacionamento acabou.
                    </small>
                  </span>
                  <form action={archiveClient}>
                    <input name="clientId" type="hidden" value={client.id} />
                    <ConfirmDialog
                      className="button button--secondary button--small"
                      confirmLabel="Arquivar cliente"
                      confirmation="O cliente sai das listas do dia a dia e para de gerar alertas. Você pode desarquivar quando quiser, sem perder nada."
                      icon="archive"
                      label="Arquivar"
                      title={`Arquivar ${client.name}`}
                      tone="default"
                    />
                  </form>
                </div>
              </div>
              <div className="action-row">
                <div className="action-row__head">
                  <span className="action-row__icon" data-tone="danger">
                    <Icon className="size-4" name="trash" />
                  </span>
                  <span className="action-row__text">
                    <strong>Excluir definitivamente</strong>
                    <small>
                      Só funciona para clientes sem serviços, cobranças, despesas ou domínios.
                      Havendo histórico, arquive em vez de excluir.
                    </small>
                  </span>
                  <form action={deleteClient}>
                    <input name="clientId" type="hidden" value={client.id} />
                    <ConfirmDialog
                      className="button button--danger-outline button--small"
                      confirmLabel="Excluir cliente"
                      confirmation={`${client.name} sai do sistema para sempre, junto com os contatos cadastrados. Não há como desfazer.`}
                      icon="trash"
                      label="Excluir"
                      requiredPhrase={client.name}
                      title="Excluir cliente definitivamente"
                    />
                  </form>
                </div>
              </div>
            </div>
          </FormPanel>
        </section>
      ) : null}
    </AccountShell>
  );
}
