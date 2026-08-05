import type { Metadata } from "next";

import { createCharge, deleteOperationalRecord, markChargePaid } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { SoftSubmitButton } from "@/components/ui/soft-submit-button";
import { formatCurrency, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { cancellationReasons } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { CancelChargeForm } from "./cancel-charge-form";
import { DelayReasonForm } from "./delay-reason-form";
import { FocusCharge } from "./focus-charge";

export const metadata: Metadata = { title: "Cobranças" };

const paymentMethods = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];
const paymentOptions = paymentMethods.map((method) => ({ label: method, value: method }));
const cancellationLabels = new Map<string, string>(cancellationReasons.map(([v, l]) => [v, l]));

const statusLabels: Record<string, string> = {
  cancelled: "Cancelada",
  overdue: "Vencida",
  paid: "Paga",
  pending: "Pendente",
};

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    focus?: string;
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
      "id, client_id, description, due_date, company_revenue, media_budget, additional_fee, gross_total, status, paid_at, payment_method, delay_reason, delay_reason_code, delay_recorded_at, cancel_reason, cancel_reason_code, clients(name)",
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
      description="As cobranças nascem dos serviços dos clientes. Aqui você acompanha, recebe e ajusta."
      title="Cobranças"
    >
      <MvpStatusMessage status={parameters.status} />
      <FocusCharge chargeId={parameters.focus} />

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
            Cobrança avulsa
          </span>
          <span className="text-muted flex items-center gap-1 text-xs">
            <span className="form-disclosure__closed-label">Abrir formulário</span>
            <span className="form-disclosure__open-label">Fechar formulário</span>
            <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
          </span>
        </summary>
        <p className="helper-note mt-3">
          <Icon className="size-4" name="info" /> O caminho normal é aplicar um serviço no card do
          cliente, que já cria e renova as cobranças. Use este formulário para lançamentos fora da
          recorrência ou para registrar algo que já aconteceu.
        </p>
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
          <SelectField
            defaultValue={parameters.serviceId ?? ""}
            label="Serviço vinculado"
            name="clientServiceId"
            optional
            options={[
              { description: "Cobrança independente", label: "Sem vínculo", value: "" },
              ...(services ?? []).map((service) => ({
                description: clientNames.get(service.client_id),
                label: service.name,
                value: service.id,
              })),
            ]}
            placeholder="Sem vínculo"
          />
          <label className="field sm:col-span-2">
            <span className="field__label">Descrição</span>
            <input
              maxLength={200}
              name="description"
              placeholder="Ex.: Gestão de tráfego — agosto"
            />
          </label>
          <DateField defaultValue={today} label="Vencimento" name="dueDate" required />
          <label className="field">
            <span className="field__label">
              Receita própria
              <FieldHint>
                O que fica com você. É este valor que entra nos relatórios de faturamento.
              </FieldHint>
            </span>
            <input
              min="0"
              name="companyRevenue"
              placeholder="Ex.: 1500,00"
              step="0.01"
              type="number"
            />
          </label>
          <label className="field">
            <span className="field__label">
              Verba de mídia <span className="field__optional">opcional</span>
              <FieldHint>
                Dinheiro do cliente que só passa por você para virar anúncio. Não conta como sua
                receita.
              </FieldHint>
            </span>
            <input min="0" name="mediaBudget" placeholder="Ex.: 800,00" step="0.01" type="number" />
          </label>
          <label className="field">
            <span className="field__label">
              Adicional <span className="field__optional">opcional</span>
            </span>
            <input
              min="0"
              name="additionalFee"
              placeholder="Ex.: 120,00"
              step="0.01"
              type="number"
            />
          </label>
          <div className="option-card sm:col-span-2">
            <label className="option-card__toggle">
              <input name="alreadyPaid" type="checkbox" />
              <span>
                <strong>Esta cobrança já foi paga</strong>
                <small>
                  Para registrar algo que aconteceu antes de você usar o sistema. Entra direto como
                  quitada, na data de vencimento informada.
                </small>
              </span>
            </label>
            <div className="mt-3">
              <SelectField
                defaultValue="Pix"
                label="Forma de pagamento"
                name="paymentMethod"
                options={paymentOptions}
              />
            </div>
          </div>
          <label className="field sm:col-span-2">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea maxLength={5000} name="notes" />
          </label>
          <div className="sm:col-span-2">
            <SoftSubmitButton
              idleLabel="Criar cobrança"
              requirements={[
                { message: "Descreva a cobrança para reconhecê-la depois.", name: "description" },
                {
                  message: "Todos os valores estão zerados — a cobrança precisa de algum valor.",
                  name: ["companyRevenue", "mediaBudget", "additionalFee"],
                  warnOnZero: true,
                },
              ]}
            />
          </div>
        </form>
      </details>

      {error ? (
        <p role="alert">Não foi possível carregar as cobranças.</p>
      ) : charges?.length ? (
        <div className="charge-list">
          {charges.map((charge) => {
            const effectiveStatus =
              charge.status === "pending" && charge.due_date < today ? "overdue" : charge.status;
            return (
              <article
                className={`charge-card ${effectiveStatus === "overdue" ? "critical-card" : ""}`}
                id={`charge-${charge.id}`}
                key={charge.id}
              >
                <div className="charge-card__head">
                  <div className="min-w-0">
                    <h2>{charge.description}</h2>
                    <p>
                      {charge.clients?.name ?? "Cliente"} · vencimento{" "}
                      {formatDatePtBr(charge.due_date)}
                    </p>
                  </div>
                  <span className={`charge-status charge-status--${effectiveStatus}`}>
                    {statusLabels[effectiveStatus]}
                  </span>
                </div>

                <dl className="charge-card__values">
                  <div>
                    <dt>Receita própria</dt>
                    <dd>{formatCurrency(charge.company_revenue)}</dd>
                  </div>
                  <div>
                    <dt>Mídia</dt>
                    <dd>{formatCurrency(charge.media_budget)}</dd>
                  </div>
                  <div>
                    <dt>Adicional</dt>
                    <dd>{formatCurrency(charge.additional_fee)}</dd>
                  </div>
                  <div>
                    <dt>Total bruto</dt>
                    <dd className="font-black">
                      {Number(charge.gross_total) === 0
                        ? "Cortesia"
                        : formatCurrency(charge.gross_total)}
                    </dd>
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

                {charge.status === "cancelled" && charge.cancel_reason ? (
                  <div className="delay-reason-note">
                    <Icon className="size-4" name="x" />
                    <span>
                      <strong>
                        {cancellationLabels.get(charge.cancel_reason_code ?? "") ?? "Cancelada"}:
                      </strong>{" "}
                      {charge.cancel_reason}
                    </span>
                  </div>
                ) : null}

                {charge.status === "pending" ? (
                  <div className="charge-card__actions">
                    <form action={markChargePaid} className="charge-settle">
                      <input name="id" type="hidden" value={charge.id} />
                      <SelectField
                        defaultValue="Pix"
                        label="Forma de pagamento"
                        name="paymentMethod"
                        options={paymentOptions}
                      />
                      <SubmitButton idleLabel="Marcar como paga" pendingLabel="Registrando…" />
                    </form>
                    <div className="charge-card__secondary">
                      <CancelChargeForm chargeId={charge.id} description={charge.description} />
                      <form action={deleteOperationalRecord}>
                        <input name="clientId" type="hidden" value="" />
                        <input name="id" type="hidden" value={charge.id} />
                        <input name="recordType" type="hidden" value="charge" />
                        <ConfirmDialog
                          className="charge-action charge-action--danger"
                          confirmLabel="Excluir cobrança"
                          confirmation="A cobrança some do sistema sem deixar registro. Se ela existiu de verdade, prefira cancelar para manter o histórico."
                          icon="trash"
                          label="Excluir"
                          title={charge.description}
                        />
                      </form>
                    </div>
                  </div>
                ) : charge.paid_at ? (
                  <p className="charge-card__footnote">
                    <Icon className="size-4" name="check" /> Pago em{" "}
                    {new Date(charge.paid_at).toLocaleString("pt-BR")} via {charge.payment_method}
                  </p>
                ) : charge.status === "cancelled" ? (
                  <div className="charge-card__actions">
                    <form action={deleteOperationalRecord}>
                      <input name="clientId" type="hidden" value="" />
                      <input name="id" type="hidden" value={charge.id} />
                      <input name="recordType" type="hidden" value="charge" />
                      <ConfirmDialog
                        className="charge-action charge-action--danger"
                        confirmLabel="Excluir cobrança"
                        confirmation="A cobrança cancelada some do sistema sem deixar registro."
                        icon="trash"
                        label="Excluir cobrança"
                        title={charge.description}
                      />
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhuma cobrança</h2>
          <p className="text-muted mt-2">
            Aplique um serviço no card de um cliente para que as cobranças passem a nascer sozinhas.
          </p>
        </section>
      )}
    </AccountShell>
  );
}
