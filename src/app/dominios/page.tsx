import type { Metadata } from "next";

import { cancelDomain, createDomain } from "@/app/_actions/mvp";
import { AccountShell } from "@/app/_components/account-shell";
import { ConfirmSubmitButton } from "@/app/_components/confirm-submit-button";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { expiryLabel, formatCurrency, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Domínios" };

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const [{ data: clients }, { data: domains, error }] = await Promise.all([
    context.supabase
      .from("clients")
      .select("id, name")
      .eq("workspace_id", context.workspaceId)
      .eq("commercial_status", "active")
      .is("archived_at", null)
      .order("name"),
    context.supabase
      .from("domains")
      .select(
        "id, domain, registrar, expires_on, auto_renew, cost, payment_responsibility, status, clients(name)",
      )
      .eq("workspace_id", context.workspaceId)
      .order("expires_on"),
  ]);
  const today = isoToday();

  return (
    <AccountShell
      description="Acompanhe expirações e responsáveis antes que um domínio fique indisponível."
      fullName={context.fullName}
      theme={context.theme}
      title="Domínios"
    >
      <MvpStatusMessage status={parameters.status} />
      <details className="border-line bg-surface mb-6 rounded-2xl border p-5">
        <summary className="cursor-pointer font-semibold">Novo domínio</summary>
        <form action={createDomain} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Cliente
            <select
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
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
          <label className="text-sm font-semibold">
            Data de expiração
            <input
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3"
              defaultValue={today}
              name="expiresOn"
              required
              type="date"
            />
          </label>
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
              <article className="border-line bg-surface rounded-2xl border p-5" key={domain.id}>
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
                    <dd>{domain.expires_on}</dd>
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
                ) : null}
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
