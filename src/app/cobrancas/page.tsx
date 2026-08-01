import type { Metadata } from "next";

import { cancelCharge, createCharge, markChargePaid } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmSubmitButton } from "@/app/_components/confirm-submit-button";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { formatCurrency, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Cobranças" };

const paymentMethods = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; serviceId?: string; status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const [{ data: clients }, { data: services }, { data: charges, error }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", context.workspaceId)
      .eq("commercial_status", "active")
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("client_services")
      .select("id, client_id, name")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .order("name"),
    context.supabase
      .from("charges")
      .select(
        "id, client_id, description, due_date, company_revenue, media_budget, additional_fee, gross_total, status, paid_at, payment_method, clients(name)",
      )
      .eq("workspace_id", context.workspaceId)
      .order("due_date", { ascending: false })
      .limit(100),
  ]);
  const today = isoToday();
  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.name]));

  return (
    <AccountShell
      description="Registre recebíveis sem misturar receita da empresa com verba de mídia."
      fullName={context.fullName}
      theme={context.theme}
      title="Cobranças"
    >
      <MvpStatusMessage status={parameters.status} />
      <details
        className="border-line bg-surface mb-6 rounded-2xl border p-5"
        open={Boolean(parameters.clientId)}
      >
        <summary className="cursor-pointer font-semibold">Nova cobrança</summary>
        <form action={createCharge} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Cliente
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              defaultValue={parameters.clientId ?? ""}
              name="clientId"
              required
            >
              <option disabled value="">
                Selecione
              </option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
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
          <label className="text-sm font-semibold">
            Vencimento
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              defaultValue={today}
              name="dueDate"
              required
              type="date"
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
              <article className="border-line bg-surface rounded-2xl border p-5" key={charge.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{charge.description}</h2>
                    <p className="text-muted text-sm">
                      {charge.clients?.name ?? "Cliente"} · vencimento {charge.due_date}
                    </p>
                  </div>
                  <span className="bg-brand-soft text-brand-strong rounded-full px-3 py-1 text-xs font-semibold">
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
                  </div>
                ) : charge.paid_at ? (
                  <p className="text-muted mt-4 text-sm">
                    Pago em {new Date(charge.paid_at).toLocaleString("pt-BR")} via{" "}
                    {charge.payment_method}
                  </p>
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
