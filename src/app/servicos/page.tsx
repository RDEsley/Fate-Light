import type { Metadata } from "next";

import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { SubmitButton } from "@/app/_components/submit-button";
import { Icon } from "@/components/ui/icon";
import { formatCurrency } from "@/features/mvp/format";
import { billingFrequencies, billingFrequencyLabel } from "@/features/mvp/recurrence";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { createCatalogService, toggleCatalogService, updateCatalogService } from "./actions";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; status?: string }>;
}) {
  const [parameters, context] = await Promise.all([searchParams, requireWorkspaceContext()]);
  const query = parameters.q?.trim().slice(0, 80) ?? "";
  const state =
    parameters.state === "inactive" ? "inactive" : parameters.state === "all" ? "all" : "active";
  let request = context.supabase
    .from("services")
    .select(
      "id, name, description, active, default_price, default_billing_type, default_adjustment_interval_months, default_adjustment_rate",
    )
    .eq("workspace_id", context.workspaceId)
    .is("archived_at", null)
    .order("name");
  if (query) request = request.ilike("name", `%${query}%`);
  if (state !== "all") request = request.eq("active", state === "active");
  const { data: services, error } = await request;

  return (
    <AccountShell
      description="Crie uma vez, aplique aos clientes e personalize somente quando precisar."
      title="Catálogo de serviços"
    >
      <MvpStatusMessage status={parameters.status} />
      <form className="panel-card mb-4 flex flex-col gap-2 p-2! sm:flex-row" method="get">
        <label className="relative flex-1">
          <span className="sr-only">Buscar serviços</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <input
            className="min-h-10 w-full rounded-lg pr-3 pl-9 text-sm"
            defaultValue={query}
            name="q"
            placeholder="Buscar serviço..."
            type="search"
          />
        </label>
        <select className="min-h-10 rounded-lg px-3 text-sm" defaultValue={state} name="state">
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
        <button
          className="bg-brand text-brand-contrast min-h-10 rounded-lg px-4 text-sm font-black"
          type="submit"
        >
          Filtrar
        </button>
      </form>

      <details className="panel-card form-disclosure mb-4">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-brand-soft text-brand-strong grid size-8 place-items-center rounded-lg">
              <Icon className="size-4" name="plus" />
            </span>
            Novo serviço
          </span>
          <span className="text-muted text-xs">
            <span className="form-disclosure__closed-label">Abrir formulário</span>
            <span className="form-disclosure__open-label">Fechar formulário</span>
          </span>
        </summary>
        <ServiceCatalogForm action={createCatalogService} />
      </details>

      {error ? (
        <p role="alert">Não foi possível carregar o catálogo.</p>
      ) : services?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article className="service-catalog-card" key={service.id}>
              <div className="flex items-start justify-between gap-3">
                <span className="bg-violet-soft text-violet grid size-9 place-items-center rounded-lg">
                  <Icon className="size-4" name="briefcase" />
                </span>
                <span
                  className={service.active ? "status-pill status-pill--positive" : "status-pill"}
                >
                  {service.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <h2 className="mt-3 font-black">{service.name}</h2>
              <p className="text-muted mt-1 line-clamp-2 min-h-10 text-sm">
                {service.description ?? "Sem descrição"}
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span>
                  <small className="text-muted block">Valor padrão</small>
                  <strong>{formatCurrency(service.default_price)}</strong>
                </span>
                <span className="text-muted text-right text-xs">
                  {billingFrequencyLabel(service.default_billing_type)}
                </span>
              </div>
              {service.default_adjustment_interval_months ? (
                <p className="service-note mt-3">
                  <Icon className="size-4" name="refresh" /> Reajuste a cada{" "}
                  {service.default_adjustment_interval_months} meses ·{" "}
                  {service.default_adjustment_rate}%
                </p>
              ) : null}
              <details className="advanced-form mt-3">
                <summary>
                  <span>Editar serviço</span>
                  <span className="text-muted text-xs">Abrir</span>
                </summary>
                <ServiceCatalogForm action={updateCatalogService} service={service} />
              </details>
              <form action={toggleCatalogService} className="mt-3 border-t pt-3">
                <input name="id" type="hidden" value={service.id} />
                <input name="active" type="hidden" value={String(!service.active)} />
                <button
                  className="text-muted hover:text-foreground text-xs font-bold"
                  type="submit"
                >
                  {service.active ? "Inativar no catálogo" : "Reativar no catálogo"}
                </button>
              </form>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel-card text-center">
          <h2 className="font-black">Nenhum serviço encontrado</h2>
          <p className="text-muted mt-1 text-sm">
            Cadastre o primeiro serviço para aplicá-lo rapidamente aos clientes.
          </p>
        </section>
      )}
    </AccountShell>
  );
}

function ServiceCatalogForm({
  action,
  service,
}: {
  action: (formData: FormData) => Promise<void>;
  service?: {
    default_adjustment_interval_months: number | null;
    default_adjustment_rate: number | string | null;
    default_billing_type: string;
    default_price: number | string;
    description: string | null;
    id: string;
    name: string;
  };
}) {
  return (
    <form action={action} className="form-grid mt-3 sm:grid-cols-2">
      {service ? <input name="id" type="hidden" value={service.id} /> : null}
      <label className="field">
        <span className="field__label">Nome</span>
        <input defaultValue={service?.name} maxLength={120} name="name" required />
      </label>
      <label className="field">
        <span className="field__label">Valor padrão</span>
        <input
          defaultValue={service?.default_price ?? 0}
          min="0"
          name="defaultPrice"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="field">
        <span className="field__label">Periodicidade</span>
        <select defaultValue={service?.default_billing_type ?? "monthly"} name="billingType">
          {billingFrequencies.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">
          Reajuste a cada (meses) <span className="field__optional">opcional</span>
        </span>
        <input
          defaultValue={service?.default_adjustment_interval_months ?? ""}
          max="60"
          min="1"
          name="adjustmentIntervalMonths"
          type="number"
        />
      </label>
      <label className="field">
        <span className="field__label">
          Sugestão de reajuste (%) <span className="field__optional">opcional</span>
        </span>
        <input
          defaultValue={service?.default_adjustment_rate ?? ""}
          max="100"
          min="0"
          name="adjustmentRate"
          step="0.01"
          type="number"
        />
      </label>
      <label className="field sm:col-span-2">
        <span className="field__label">
          Descrição <span className="field__optional">opcional</span>
        </span>
        <textarea defaultValue={service?.description ?? ""} maxLength={3000} name="description" />
      </label>
      <SubmitButton
        className="sm:col-span-2"
        idleLabel={service ? "Salvar alterações" : "Criar serviço"}
      />
    </form>
  );
}
