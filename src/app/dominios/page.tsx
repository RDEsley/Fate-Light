import type { Metadata } from "next";

import { cancelDomain, createDomain, deleteOperationalRecord } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmSubmitButton } from "@/app/_components/confirm-submit-button";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { ClientCombobox, DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { expiryLabel, formatCurrency, formatDatePtBr, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Domínios" };

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const state = ["active", "cancelled"].includes(parameters.state ?? "")
    ? parameters.state!
    : "all";
  let domainsRequest = context.supabase
    .from("domains")
    .select(
      "id, domain, registrar, expires_on, auto_renew, cost, payment_responsibility, status, clients(name)",
    )
    .eq("workspace_id", context.workspaceId)
    .order("expires_on");
  if (query) domainsRequest = domainsRequest.ilike("domain", `%${query}%`);
  if (state !== "all") domainsRequest = domainsRequest.eq("status", state);
  const [{ data: clients }, { data: domains, error }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name, trade_name, commercial_status")
      .eq("workspace_id", context.workspaceId)
      .is("archived_at", null)
      .order("name"),
    domainsRequest,
  ]);
  const today = isoToday();

  return (
    <AccountShell
      description="Acompanhe expirações e responsáveis antes que um domínio fique indisponível."
      title="Domínios"
    >
      <MvpStatusMessage status={parameters.status} />
      <form className="panel-card mb-4 flex flex-col gap-3 p-3! sm:flex-row" method="get">
        <label className="relative flex-1">
          <span className="sr-only">Buscar domínios</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <input
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Buscar domínio..."
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
            <option value="active">Ativos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </label>
        <button
          className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 text-sm font-black"
          type="submit"
        >
          Filtrar
        </button>
      </form>
      <details className="panel-card form-disclosure mb-5">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-violet-soft text-violet grid size-9 place-items-center rounded-xl">
              <Icon className="size-4" name="plus" />
            </span>
            Novo domínio
          </span>
          <span className="text-muted flex items-center gap-1 text-xs">
            <span className="form-disclosure__closed-label">Abrir formulário</span>
            <span className="form-disclosure__open-label">Fechar formulário</span>
            <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
          </span>
        </summary>
        <form action={createDomain} className="form-grid mt-4 sm:grid-cols-2">
          <ClientCombobox
            clients={(clients ?? []).map((client) => ({
              id: client.id,
              name: client.name,
              status: client.commercial_status,
              tradeName: client.trade_name,
            }))}
            defaultFilter="all"
          />
          <label className="text-sm font-semibold">
            Domínio
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              name="domain"
              placeholder="exemplo.com.br"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Registrador opcional
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              maxLength={120}
              name="registrar"
            />
          </label>
          <DateField defaultValue={today} label="Data de expiração" name="expiresOn" required />
          <label className="text-sm font-semibold">
            Custo opcional
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              min="0"
              name="cost"
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm font-semibold">
            Responsável pelo pagamento
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              defaultValue="Empresa"
              maxLength={120}
              name="paymentResponsibility"
              required
            />
          </label>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input name="autoRenew" type="checkbox" /> Renovação automática
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
            <SubmitButton idleLabel="Criar domínio" />
          </div>
        </form>
      </details>
      {error ? (
        <p role="alert">Não foi possível carregar os domínios.</p>
      ) : domains?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {domains.map((domain) => {
            const expiry =
              domain.status === "cancelled"
                ? { label: "Cancelado", tone: "ok" as const }
                : expiryLabel(domain.expires_on, today);
            return (
              <article className="cartoon-card p-4 sm:p-5" key={domain.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{domain.domain}</h2>
                    <p className="text-muted text-sm">{domain.clients?.name ?? "Cliente"}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${expiry.tone === "danger" ? "bg-red-100 text-red-800" : expiry.tone === "warning" ? "bg-amber-100 text-amber-900" : "bg-brand-soft text-brand-strong"}`}
                  >
                    {expiry.label}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Expira em</dt>
                    <dd>{formatDatePtBr(domain.expires_on)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Renovação</dt>
                    <dd>{domain.auto_renew ? "Automática" : "Manual"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Custo</dt>
                    <dd>{domain.cost === null ? "Não informado" : formatCurrency(domain.cost)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Pagamento</dt>
                    <dd>{domain.payment_responsibility}</dd>
                  </div>
                </dl>
                {domain.registrar ? (
                  <p className="text-muted mt-4 text-sm">Registrador: {domain.registrar}</p>
                ) : null}
                {domain.status === "active" ? (
                  <form action={cancelDomain} className="mt-4">
                    <input name="id" type="hidden" value={domain.id} />
                    <ConfirmSubmitButton
                      className="font-semibold hover:underline"
                      confirmation="Cancelar o acompanhamento deste domínio? O histórico será preservado."
                      label="Cancelar domínio"
                    />
                  </form>
                ) : (
                  <form action={deleteOperationalRecord} className="mt-4">
                    <input name="clientId" type="hidden" value="" />
                    <input name="id" type="hidden" value={domain.id} />
                    <input name="recordType" type="hidden" value="domain" />
                    <ConfirmSubmitButton
                      className="text-negative font-semibold hover:underline"
                      confirmation="Excluir definitivamente este domínio cancelado?"
                      label="Excluir domínio"
                    />
                  </form>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="border-line bg-surface rounded-2xl border p-8 text-center">
          <h2 className="text-xl font-semibold">Nenhum domínio</h2>
        </section>
      )}
    </AccountShell>
  );
}
