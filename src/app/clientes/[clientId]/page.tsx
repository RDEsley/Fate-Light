import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  deleteOperationalRecord,
  endClientService,
  reactivateClientService,
  updateClientServiceSchedule,
} from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmSubmitButton } from "@/app/_components/confirm-submit-button";
import { SubmitButton } from "@/app/_components/submit-button";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatDatePtBr, isoToday } from "@/features/mvp/format";
import {
  billingFrequencies,
  billingFrequencyLabel,
  type BillingFrequency,
} from "@/features/mvp/recurrence";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { deleteClient } from "../actions";
import { ClientStatusMessage } from "../status-message";
import { ServiceApplicationForm } from "./service-application-form";

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
  ] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, email, phone, commercial_status, notes")
      .eq("id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .single(),
    context.supabase
      .from("client_services")
      .select(
        "id, name, description, list_price, discount_type, discount_value, company_revenue, media_budget, additional_fee, billing_type, installment_count, promotional_price, promotional_cycles, start_date, next_due_date, adjustment_interval_months, adjustment_rate, next_adjustment_date, ended_at, status, notes",
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
  ]);
  if (error || servicesError || catalogError || !client) notFound();

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

      <section className="border-line bg-surface rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Dados do cliente</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted text-sm">Empresa</dt>
            <dd className="mt-1">{client.trade_name ?? "Não informada"}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">E-mail</dt>
            <dd className="mt-1">{client.email ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">Telefone</dt>
            <dd className="mt-1">{client.phone ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-muted text-sm">Status</dt>
            <dd className="mt-1">{client.commercial_status === "active" ? "Ativo" : "Inativo"}</dd>
          </div>
        </dl>
        {client.notes ? (
          <p className="text-muted mt-5 text-sm whitespace-pre-wrap">{client.notes}</p>
        ) : null}
        <details className="danger-zone form-disclosure mt-5">
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-negative flex items-center gap-2 font-black">
              <Icon className="size-4" name="trash" /> Excluir cliente
            </span>
            <span className="text-muted flex items-center gap-1 text-xs">
              <span className="form-disclosure__closed-label">Ver opções</span>
              <span className="form-disclosure__open-label">Fechar opções</span>
              <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted max-w-2xl text-sm">
              Só é possível excluir clientes sem serviços, cobranças, despesas ou domínios. Se
              houver histórico, mantenha o cliente inativo.
            </p>
            <form action={deleteClient}>
              <input name="clientId" type="hidden" value={client.id} />
              <ConfirmSubmitButton
                className="danger-action"
                confirmation={`Excluir ${client.name} definitivamente? Esta ação não pode ser desfeita.`}
                label="Excluir definitivamente"
              />
            </form>
          </div>
        </details>
      </section>

      <section className="border-line bg-surface mt-6 rounded-2xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Serviços</h2>
            <p className="text-muted mt-1 text-sm">Receita própria e mídia permanecem separadas.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {services?.length ? (
            services.map((service) => (
              <article className="border-line rounded-xl border p-5" key={service.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{service.name}</h3>
                  <span className="bg-brand-soft text-brand-strong rounded-full px-3 py-1 text-xs font-semibold">
                    {service.status === "active" ? "Ativo" : "Encerrado"}
                  </span>
                </div>
                {service.description ? (
                  <p className="text-muted mt-2 text-sm">{service.description}</p>
                ) : null}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Valor cheio</dt>
                    <dd>{formatCurrency(service.list_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Valor aplicado</dt>
                    <dd className="text-positive font-black">
                      {formatCurrency(service.company_revenue)}
                    </dd>
                    {service.discount_type !== "none" ? (
                      <small className="text-muted">
                        desconto de{" "}
                        {service.discount_type === "percentage"
                          ? `${service.discount_value}%`
                          : formatCurrency(service.discount_value)}
                      </small>
                    ) : null}
                  </div>
                  <div>
                    <dt className="text-muted">Cobrança</dt>
                    <dd>{billingFrequencyLabel(service.billing_type)}</dd>
                    {service.billing_type === "single" && service.installment_count > 1 ? (
                      <small className="text-muted">{service.installment_count} parcelas</small>
                    ) : null}
                  </div>
                  <div>
                    <dt className="text-muted">Próximo vencimento</dt>
                    <dd>
                      {service.next_due_date
                        ? formatDatePtBr(service.next_due_date)
                        : "Sem próxima data"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Tempo contratado</dt>
                    <dd>{serviceDuration(service.start_date, service.ended_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Mídia + adicional</dt>
                    <dd>
                      {formatCurrency(
                        Number(service.media_budget) + Number(service.additional_fee),
                      )}
                    </dd>
                  </div>
                </dl>
                {service.promotional_price !== null ? (
                  <p className="service-note service-note--promo">
                    <Icon className="size-4" name="sparkles" />{" "}
                    {formatCurrency(service.promotional_price)}
                    nos primeiros {service.promotional_cycles} ciclos
                  </p>
                ) : null}
                {service.next_adjustment_date ? (
                  <p className="service-note">
                    <Icon className="size-4" name="refresh" /> Revisar preço em{" "}
                    {formatDatePtBr(service.next_adjustment_date)}
                    {service.adjustment_rate !== null
                      ? ` · sugestão de ${service.adjustment_rate}%`
                      : ""}
                  </p>
                ) : null}
                {service.status === "active" ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-4">
                      <Link
                        className="font-semibold hover:underline"
                        href={`/cobrancas?clientId=${client.id}&serviceId=${service.id}`}
                      >
                        Criar cobrança
                      </Link>
                      <form action={endClientService}>
                        <input name="clientId" type="hidden" value={client.id} />
                        <input name="id" type="hidden" value={service.id} />
                        <ConfirmSubmitButton
                          className="font-semibold hover:underline"
                          confirmation="Encerrar este serviço? A ação não apaga o histórico."
                          label="Encerrar"
                        />
                      </form>
                    </div>
                    <details className="form-disclosure border-line mt-4 border-t pt-3">
                      <summary className="text-brand-strong flex cursor-pointer justify-between text-sm font-black">
                        Ajustar agenda futura
                        <span className="text-muted flex items-center gap-1 text-xs">
                          <span className="form-disclosure__closed-label">Abrir</span>
                          <span className="form-disclosure__open-label">Fechar</span>
                          <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
                        </span>
                      </summary>
                      <form
                        action={updateClientServiceSchedule}
                        className="form-grid mt-3 sm:grid-cols-2"
                      >
                        <input name="clientId" type="hidden" value={client.id} />
                        <input name="id" type="hidden" value={service.id} />
                        <label className="field">
                          <span className="field__label">Frequência</span>
                          <select defaultValue={service.billing_type} name="billingType">
                            {billingFrequencies.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <DateField
                          defaultValue={service.next_due_date ?? isoToday()}
                          label="Próxima cobrança"
                          name="nextDueDate"
                          required
                        />
                        <SubmitButton className="sm:col-span-2" idleLabel="Atualizar agenda" />
                      </form>
                    </details>
                  </>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form action={reactivateClientService}>
                      <input name="clientId" type="hidden" value={client.id} />
                      <input name="id" type="hidden" value={service.id} />
                      <SubmitButton idleLabel="Reativar serviço" pendingLabel="Reativando…" />
                    </form>
                    <form action={deleteOperationalRecord}>
                      <input name="clientId" type="hidden" value={client.id} />
                      <input name="id" type="hidden" value={service.id} />
                      <input name="recordType" type="hidden" value="service" />
                      <ConfirmSubmitButton
                        className="danger-action"
                        confirmation="Excluir este serviço encerrado? Isso só será permitido se não houver cobranças vinculadas."
                        label="Excluir"
                      />
                    </form>
                  </div>
                )}
              </article>
            ))
          ) : (
            <p className="text-muted text-sm">Nenhum serviço adicionado.</p>
          )}
        </div>

        {client.commercial_status === "active" ? (
          <details className="form-disclosure border-line mt-6 border-t pt-5">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              <span>Adicionar serviço</span>
              <span className="text-muted flex items-center gap-1 text-xs">
                <span className="form-disclosure__closed-label">Abrir formulário</span>
                <span className="form-disclosure__open-label">Fechar formulário</span>
                <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
              </span>
            </summary>
            <div className="mt-4">
              <ServiceApplicationForm
                catalog={(catalog ?? []).map((service) => ({
                  adjustmentIntervalMonths: service.default_adjustment_interval_months,
                  adjustmentRate:
                    service.default_adjustment_rate === null
                      ? null
                      : Number(service.default_adjustment_rate),
                  billingType: service.default_billing_type as BillingFrequency,
                  defaultPrice: Number(service.default_price),
                  description: service.description,
                  id: service.id,
                  name: service.name,
                }))}
                clientId={client.id}
              />
            </div>
          </details>
        ) : null}
      </section>
    </AccountShell>
  );
}
