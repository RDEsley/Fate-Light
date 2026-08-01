import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { createClientService, endClientService } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmSubmitButton } from "@/app/_components/confirm-submit-button";
import { SubmitButton } from "@/app/_components/submit-button";
import { formatCurrency, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { ClientStatusMessage } from "../status-message";

export const metadata: Metadata = { title: "Detalhes do cliente" };

const serviceSuggestions = [
  "Landing Page",
  "Site institucional",
  "Gestão de Google Ads",
  "Manutenção",
  "Hospedagem",
  "Domínio",
  "Serviço personalizado",
];

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

  const [{ data: client, error }, { data: services, error: servicesError }] = await Promise.all([
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
        "id, name, description, company_revenue, media_budget, additional_fee, billing_type, start_date, next_due_date, status, notes",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false }),
  ]);
  if (error || servicesError || !client) notFound();

  return (
    <AccountShell
      description="Dados do cliente, serviços contratados e atalhos para a operação financeira."
      fullName={context.fullName}
      theme={context.theme}
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
                    <dt className="text-muted">Receita própria</dt>
                    <dd>{formatCurrency(service.company_revenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Verba de mídia</dt>
                    <dd>{formatCurrency(service.media_budget)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Adicional</dt>
                    <dd>{formatCurrency(service.additional_fee)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Próximo vencimento</dt>
                    <dd>{service.next_due_date ?? "Não definido"}</dd>
                  </div>
                </dl>
                {service.status === "active" ? (
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
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted text-sm">Nenhum serviço adicionado.</p>
          )}
        </div>

        {client.commercial_status === "active" ? (
          <details className="border-line mt-6 border-t pt-5">
            <summary className="cursor-pointer font-semibold">Adicionar serviço</summary>
            <form action={createClientService} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input name="clientId" type="hidden" value={client.id} />
              <label className="text-sm font-semibold sm:col-span-2">
                Serviço
                <input
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  list="service-suggestions"
                  maxLength={120}
                  name="name"
                  required
                />
                <datalist id="service-suggestions">
                  {serviceSuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Descrição opcional
                <textarea
                  className="border-line bg-canvas mt-2 min-h-24 w-full rounded-xl border px-4 py-3"
                  maxLength={3000}
                  name="description"
                />
              </label>
              <label className="text-sm font-semibold">
                Receita própria
                <input
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  defaultValue="0"
                  min="0"
                  name="companyRevenue"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="text-sm font-semibold">
                Verba de mídia
                <input
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  defaultValue="0"
                  min="0"
                  name="mediaBudget"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="text-sm font-semibold">
                Mensalidade adicional
                <input
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  defaultValue="0"
                  min="0"
                  name="additionalFee"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="text-sm font-semibold">
                Cobrança
                <select
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  defaultValue="monthly"
                  name="billingType"
                >
                  <option value="monthly">Mensal</option>
                  <option value="single">Única</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Data de início
                <input
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  defaultValue={isoToday()}
                  name="startDate"
                  required
                  type="date"
                />
              </label>
              <label className="text-sm font-semibold">
                Próximo vencimento
                <input
                  className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
                  defaultValue={isoToday()}
                  name="nextDueDate"
                  required
                  type="date"
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Observações
                <textarea
                  className="border-line bg-canvas mt-2 min-h-24 w-full rounded-xl border px-4 py-3"
                  maxLength={5000}
                  name="notes"
                />
              </label>
              <div className="sm:col-span-2">
                <SubmitButton idleLabel="Adicionar serviço" />
              </div>
            </form>
          </details>
        ) : null}
      </section>
    </AccountShell>
  );
}
