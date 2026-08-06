import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { clientStatusInfo, isBillableClientStatus } from "@/features/clients/status";
import { formatCurrency } from "@/features/mvp/format";
import { type BillingFrequency } from "@/features/mvp/recurrence";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { archiveClient, deleteClient, restoreClient } from "../actions";
import { ClientStatusMessage } from "../status-message";
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
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ clientId: rawClientId }, { status }, context] = await Promise.all([
    params,
    searchParams,
    requireWorkspaceContext(),
  ]);
  const clientId = z.string().uuid().safeParse(rawClientId);
  if (!clientId.success) notFound();

  const [
    { data: client, error },
    { data: services, error: servicesError },
    { data: catalog, error: catalogError },
    { data: charges },
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
        "id, name, description, list_price, discount_type, discount_value, company_revenue, media_budget, additional_fee, billing_type, installment_count, promotional_price, promotional_cycles, promotional_cycles_used, start_date, next_due_date, adjustment_interval_months, adjustment_rate, next_adjustment_date, ended_at, status, notes",
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
      .select("client_service_id, company_revenue, status")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId),
  ]);
  if (error || servicesError || catalogError || !client) notFound();

  const statusInfo = clientStatusInfo(client.archived_at ? "archived" : client.commercial_status);
  const archived = Boolean(client.archived_at);
  const earned = (charges ?? [])
    .filter((charge) => charge.status === "paid")
    .reduce((total, charge) => total + Number(charge.company_revenue), 0);
  const pending = (charges ?? [])
    .filter((charge) => charge.status === "pending")
    .reduce((total, charge) => total + Number(charge.company_revenue), 0);
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
      totals.paidRevenue += Number(charge.company_revenue);
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

  return (
    <AccountShell
      description="Dados do cliente, serviços contratados e atalhos para a operação financeira."
      title={client.name}
    >
      <ClientStatusMessage status={status} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="font-semibold hover:underline" href="/clientes">
          ← Voltar
        </Link>
        <div className="flex flex-wrap gap-3">
          <Link
            className="border-line rounded-xl border px-4 py-2 font-semibold"
            href={`/cobrancas?clientId=${client.id}`}
          >
            Nova cobrança
          </Link>
          <Link
            className="bg-brand text-brand-contrast rounded-xl px-4 py-2 font-semibold"
            href={`/clientes/${client.id}/editar`}
          >
            Editar cliente
          </Link>
        </div>
      </div>

      {archived ? (
        <section className="panel-card mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-sm">
            <strong className="text-foreground">Cliente arquivado.</strong> O histórico está
            preservado, mas ele não aparece na operação do dia a dia.
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

      <section className="panel-card mt-4">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-violet-soft text-violet">
            <Icon name="briefcase" />
          </span>
          <div>
            <h2>Serviços</h2>
            <p>Receita própria e verba de mídia permanecem separadas.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {services?.length ? (
            services.map((service) => (
              <ServiceCard
                catalog={catalogOptions}
                clientId={client.id}
                duration={serviceDuration(service.start_date, service.ended_at)}
                key={service.id}
                service={{
                  additionalFee: Number(service.additional_fee),
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
            <p className="text-muted text-sm">Nenhum serviço adicionado.</p>
          )}
        </div>

        {isBillableClientStatus(client.commercial_status) && !archived ? (
          <details className="form-disclosure border-line mt-6 border-t pt-5">
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
              <ServiceApplicationForm catalog={catalogOptions} clientId={client.id} />
            </div>
          </details>
        ) : (
          <p className="helper-note mt-5">
            <Icon className="size-4" name="info" />
            {archived
              ? "Desarquive o cliente para voltar a aplicar serviços."
              : `Clientes em “${statusInfo.label}” não recebem novos serviços. Mude a situação comercial para continuar.`}
          </p>
        )}
      </section>

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
