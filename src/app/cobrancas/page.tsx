import type { Metadata } from "next";

import {
  cancelCharge,
  createCharge,
  deleteOperationalRecord,
  markChargePaid,
} from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmSubmitButton } from "@/app/_components/confirm-submit-button";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { ClientCombobox, DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { DelayReasonForm } from "./delay-reason-form";

export const metadata: Metadata = { title: "Cobranças" };

const paymentMethods = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    q?: string;
    serviceId?: string;
    state?: string;
    status?: string;
  }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const state = ["pending", "paid", "cancelled"].includes(parameters.state ?? "")
    ? parameters.state!
    : "all";
  let chargesRequest = context.supabase
    .from("charges")
    .select(
      "id, client_id, description, due_date, company_revenue, media_budget, additional_fee, gross_total, status, paid_at, payment_method, delay_reason, delay_reason_code, delay_recorded_at, clients(name)",
    )
    .eq("workspace_id", context.workspaceId)
    .order("due_date", { ascending: false })
    .limit(100);
  if (query) chargesRequest = chargesRequest.ilike("description", `%${query}%`);
  if (state !== "all") chargesRequest = chargesRequest.eq("status", state);
  const [{ data: clients }, { data: services }, { data: charges, error }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("client_services")
      .select("id, client_id, name")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .order("name"),
    chargesRequest,
  ]);
  const today = isoToday();
  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.name]));

  return (
    <AccountShell
      description="Registre recebíveis sem misturar receita da empresa com verba de mídia."
      title="Cobranças"
    >
      <MvpStatusMessage status={parameters.status} />
      <form className="panel-card mb-4 flex flex-col gap-3 p-3! sm:flex-row" method="get">
        <label className="relative flex-1">
          <span className="sr-only">Buscar cobranças</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <input
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Buscar por descrição..."
            type="search"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por status</span>
          <select
            className="min-h-11 w-full rounded-xl px-3 text-sm sm:w-40"
            defaultValue={state}
            name="state"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 text-sm font-black"
          type="submit"
        >
          Filtrar
        </button>
      </form>
      <details className="panel-card form-disclosure mb-5" open={Boolean(parameters.clientId)}>
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-warning-soft text-warning grid size-9 place-items-center rounded-xl">
              <Icon className="size-4" name="plus" />
            </span>
            Nova cobrança
          </span>
          <span className="text-muted flex items-center gap-1 text-xs">
            <span className="form-disclosure__closed-label">Abrir formulário</span>
            <span className="form-disclosure__open-label">Fechar formulário</span>
            <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
          </span>
        </summary>
        <form action={createCharge} className="form-grid mt-4 sm:grid-cols-2">
          <ClientCombobox
            clients={(clients ?? []).map((client) => ({
              id: client.id,
              name: client.name,
              status: client.commercial_status,
              tradeName: client.trade_name,
            }))}
            defaultValue={parameters.clientId}
          />
          <label className="text-sm font-semibold">
            Serviço opcional
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              defaultValue={parameters.serviceId ?? ""}
              name="clientServiceId"
            >
              <option value="">Sem vínculo</option>
              {services?.map((service) => (
                <option key={service.id} value={service.id}>
                  {clientNames.get(service.client_id)} — {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Descrição
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              maxLength={200}
              name="description"
              required
            />
          </label>
          <DateField defaultValue={today} label="Vencimento" name="dueDate" required />
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
            Adicional
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
          <label className="text-sm font-semibold sm:col-span-2">
            Observações
            <textarea
              className="border-line bg-canvas mt-2 min-h-24 w-full rounded-xl border px-4 py-3"
              maxLength={5000}
              name="notes"
            />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton idleLabel="Criar cobrança" />
          </div>
        </form>
      </details>
      {error ? (
        <p role="alert">Não foi possível carregar as cobranças.</p>
      ) : charges?.length ? (
        <div className="space-y-4">
          {charges.map((charge) => {
            const effectiveStatus =
              charge.status === "pending" && charge.due_date < today ? "overdue" : charge.status;
            return (
              <article
                className={`cartoon-card p-4 sm:p-5 ${effectiveStatus === "overdue" ? "critical-card" : ""}`}
                key={charge.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{charge.description}</h2>
                    <p className="text-muted text-sm">
                      {charge.clients?.name ?? "Cliente"} · vencimento{" "}
                      {formatDatePtBr(charge.due_date)}
                    </p>
                  </div>
                  <span
                    className={`${effectiveStatus === "overdue" ? "bg-negative-soft text-negative" : effectiveStatus === "paid" ? "bg-positive-soft text-positive" : effectiveStatus === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-warning-soft text-warning"} rounded-full px-3 py-1 text-xs font-black`}
                  >
                    {
                      {
                        pending: "Pendente",
                        paid: "Pago",
                        overdue: "Vencido",
                        cancelled: "Cancelado",
                      }[effectiveStatus]
                    }
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Receita própria</dt>
                    <dd>{formatCurrency(charge.company_revenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Mídia</dt>
                    <dd>{formatCurrency(charge.media_budget)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Adicional</dt>
                    <dd>{formatCurrency(charge.additional_fee)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Total bruto</dt>
                    <dd className="font-semibold">{formatCurrency(charge.gross_total)}</dd>
                  </div>
                </dl>
                {effectiveStatus === "overdue" ? (
                  charge.delay_reason ? (
                    <div className="delay-reason-note">
                      <Icon className="size-4" name="history" />
                      <span>
                        <strong>Motivo registrado:</strong> {charge.delay_reason}
                      </span>
                    </div>
                  ) : (
                    <DelayReasonForm chargeId={charge.id} />
                  )
                ) : null}
                {charge.status === "pending" ? (
                  <div className="mt-4 flex flex-wrap items-end gap-4">
                    <form action={markChargePaid} className="flex flex-wrap items-end gap-3">
                      <input name="id" type="hidden" value={charge.id} />
                      <label className="text-sm font-semibold">
                        Forma de pagamento
                        <select
                          className="border-line bg-canvas mt-2 min-h-10 rounded-xl border px-3"
                          name="paymentMethod"
                        >
                          {paymentMethods.map((method) => (
                            <option key={method}>{method}</option>
                          ))}
                        </select>
                      </label>
                      <SubmitButton idleLabel="Marcar como paga" />
                    </form>
                    <form action={cancelCharge}>
                      <input name="id" type="hidden" value={charge.id} />
                      <ConfirmSubmitButton
                        className="min-h-10 font-semibold hover:underline"
                        confirmation="Cancelar esta cobrança? O registro será preservado."
                        label="Cancelar cobrança"
                      />
                    </form>
                    <form action={deleteOperationalRecord}>
                      <input name="clientId" type="hidden" value="" />
                      <input name="id" type="hidden" value={charge.id} />
                      <input name="recordType" type="hidden" value="charge" />
                      <ConfirmSubmitButton
                        className="text-negative min-h-10 font-semibold hover:underline"
                        confirmation="Excluir definitivamente esta cobrança ainda não paga?"
                        label="Excluir"
                      />
                    </form>
                  </div>
                ) : charge.paid_at ? (
                  <p className="text-muted mt-4 text-sm">
                    Pago em {new Date(charge.paid_at).toLocaleString("pt-BR")} via{" "}
                    {charge.payment_method}
                  </p>
                ) : charge.status === "cancelled" ? (
                  <form action={deleteOperationalRecord} className="mt-4">
                    <input name="clientId" type="hidden" value="" />
                    <input name="id" type="hidden" value={charge.id} />
                    <input name="recordType" type="hidden" value="charge" />
                    <ConfirmSubmitButton
                      className="text-negative font-semibold hover:underline"
                      confirmation="Excluir definitivamente esta cobrança cancelada?"
                      label="Excluir cobrança"
                    />
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhuma cobrança</h2>
          <p className="text-muted mt-2">
            Crie a primeira cobrança para acompanhar os recebimentos.
          </p>
        </section>
      )}
    </AccountShell>
  );
}
