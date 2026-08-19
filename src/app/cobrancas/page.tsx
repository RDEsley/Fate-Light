import type { Metadata } from "next";
import { Fragment } from "react";

import { deleteOperationalRecord, markChargePaid } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FiscalDocumentPanel } from "@/components/ui/fiscal-document-panel";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { formatCurrency, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { cancellationReasons } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { CancelChargeForm } from "./cancel-charge-form";
import { ChargeForm } from "./charge-form";
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
  const chargeColumns =
    "id, client_id, description, due_date, company_revenue, media_budget, additional_fee, additional_fee_is_revenue, gross_total, status, paid_at, payment_method, delay_reason, delay_reason_code, delay_recorded_at, cancel_reason, cancel_reason_code, clients(name), fiscal_documents(id, created_at, mime_type, size_bytes)";

  // Em "Todos", duas consultas de propósito: pendentes sobem ordenadas pelo vencimento
  // mais próximo, resolvidas descem ordenadas pela mais recente. Um único `order` não
  // expressa isso, e ordenar só no cliente deixaria o corte de 100 registros descartar
  // pendências antigas. `status` ausente significa "tudo que não está pendente"; quando
  // ele vem, o recorte vai no banco — filtrar em memória depois do `limit` fazia "Pagas"
  // mostrar só o que sobrasse das 100 resolvidas mais recentes, que podiam ser todas
  // canceladas.
  const buildRequest = (pending: boolean, status?: string) => {
    let request = context.supabase
      .from("charges")
      .select(chargeColumns)
      .eq("workspace_id", context.workspaceId)
      .order("due_date", { ascending: pending })
      .limit(pending ? 200 : 100);
    if (query) request = request.ilike("description", `%${query}%`);
    return status ? request.eq("status", status) : request.neq("status", "pending");
  };

  const chargesRequest =
    state === "all"
      ? Promise.all([buildRequest(true, "pending"), buildRequest(false)]).then(
          ([open, resolved]) => ({
            data: [...(open.data ?? []), ...(resolved.data ?? [])],
            error: open.error ?? resolved.error,
          }),
        )
      : buildRequest(state === "pending", state);

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
        <ChargeForm
          clients={(clients ?? []).map((client) => ({
            id: client.id,
            name: client.name,
            status: client.commercial_status,
            tradeName: client.trade_name,
          }))}
          defaultClientId={parameters.clientId}
          defaultServiceId={parameters.serviceId}
          services={(services ?? []).map((service) => ({
            clientName: clientNames.get(service.client_id),
            id: service.id,
            name: service.name,
          }))}
        />
      </details>

      {error ? (
        <p role="alert">Não foi possível carregar as cobranças.</p>
      ) : charges?.length ? (
        <div className="charge-list">
          {charges.map((charge, index) => {
            const effectiveStatus =
              charge.status === "pending" && charge.due_date < today ? "overdue" : charge.status;
            // A primeira cobrança já resolvida marca a fronteira entre "a fazer" e
            // "feito" — é o que mostra para onde a cobrança recém-paga foi.
            const startsResolved =
              charge.status !== "pending" && charges[index - 1]?.status === "pending";
            return (
              <Fragment key={charge.id}>
                {startsResolved ? (
                  <p className="charge-list__divider">
                    <Icon className="size-4" name="check" /> Resolvidas
                  </p>
                ) : null}
                <article
                  className={`charge-card ${effectiveStatus === "overdue" ? "critical-card" : ""}`}
                  id={`charge-${charge.id}`}
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
                      <dt>
                        Adicional
                        {Number(charge.additional_fee) > 0 && !charge.additional_fee_is_revenue
                          ? " (repasse)"
                          : ""}
                      </dt>
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
                    <>
                      <p className="charge-card__footnote">
                        <Icon className="size-4" name="check" /> Pago em{" "}
                        {new Date(charge.paid_at).toLocaleString("pt-BR")} via{" "}
                        {charge.payment_method}
                      </p>
                      <FiscalDocumentPanel
                        documents={(charge.fiscal_documents ?? []).map((document) => ({
                          createdAt: document.created_at,
                          id: document.id,
                          mimeType: document.mime_type,
                          sizeBytes: document.size_bytes,
                        }))}
                        entityId={charge.id}
                        entityType="charge"
                      />
                    </>
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
              </Fragment>
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
