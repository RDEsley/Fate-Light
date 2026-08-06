import type { Metadata } from "next";

import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { formatCurrency } from "@/features/mvp/format";
import { billingFrequencyLabel } from "@/features/mvp/recurrence";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import {
  createCatalogService,
  deleteCatalogService,
  toggleCatalogService,
  updateCatalogService,
} from "./actions";
import { ServiceCatalogForm } from "./service-catalog-form";

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
  const [{ data: services, error }, { data: linkedServices }] = await Promise.all([
    request,
    // Saber quem já usa cada item do catálogo permite oferecer a saída certa na exclusão
    // (desvincular) em vez de apenas bloquear e deixar o usuário sem alternativa.
    context.supabase
      .from("client_services")
      .select("service_id")
      .eq("workspace_id", context.workspaceId)
      .not("service_id", "is", null),
  ]);
  const usageByService = new Map<string, number>();
  for (const link of linkedServices ?? []) {
    if (!link.service_id) continue;
    usageByService.set(link.service_id, (usageByService.get(link.service_id) ?? 0) + 1);
  }

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
                  <span className="flex items-center gap-2">
                    <Icon className="size-4" name="edit" /> Editar serviço
                  </span>
                  <span className="text-muted text-xs">Abrir</span>
                </summary>
                <ServiceCatalogForm action={updateCatalogService} service={service} />
              </details>
              <div className="service-actions">
                <form action={toggleCatalogService}>
                  <input name="id" type="hidden" value={service.id} />
                  <input name="active" type="hidden" value={String(!service.active)} />
                  <button className="service-action" type="submit">
                    <Icon className="size-4" name={service.active ? "pause" : "play"} />
                    {service.active ? "Inativar" : "Reativar"}
                  </button>
                </form>
                <form action={deleteCatalogService}>
                  <input name="id" type="hidden" value={service.id} />
                  {usageByService.get(service.id) ? (
                    <>
                      <input name="detach" type="hidden" value="on" />
                      <ConfirmDialog
                        className="service-action service-action--danger"
                        confirmLabel="Desvincular e excluir"
                        confirmation={`${usageByService.get(service.id)} cliente(s) usam este serviço. Eles continuam com o serviço ativo e o valor combinado; apenas o item do catálogo é removido.`}
                        icon="trash"
                        label="Excluir"
                        title={`Excluir ${service.name} do catálogo`}
                        tone="default"
                      />
                    </>
                  ) : (
                    <ConfirmDialog
                      className="service-action service-action--danger"
                      confirmLabel="Excluir do catálogo"
                      confirmation="O serviço sai do catálogo para sempre. Nenhum cliente usa ele hoje, então nada mais é afetado."
                      icon="trash"
                      label="Excluir"
                      title={`Excluir ${service.name}`}
                    />
                  )}
                </form>
              </div>
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
