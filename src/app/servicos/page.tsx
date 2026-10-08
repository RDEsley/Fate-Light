import type { Metadata } from "next";

import { AccountShell } from "@/app/_components/account-shell";
import { MvpStatusMessage } from "@/app/_components/mvp-status-message";
import { FormPanel } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { SearchClearField } from "@/components/ui/search-clear-field";
import { textSearchOrFilter } from "@/features/search/list-query";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { createCatalogService } from "./actions";
import { CatalogServiceCard } from "./catalog-service-card";
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
  if (query) request = request.or(textSearchOrFilter(["name", "description"], query));
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
      <form className="panel-card mb-4 flex flex-col gap-3 p-3! sm:flex-row" method="get">
        <label className="relative flex-1">
          <span className="sr-only">Buscar serviços</span>
          <Icon
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            name="search"
          />
          <SearchClearField
            aria-label="Buscar serviços"
            className="min-h-11 w-full rounded-xl pr-4 pl-9 text-sm"
            defaultValue={query}
            placeholder="Nome ou descrição..."
          />
        </label>
        <select
          className="min-h-11 rounded-xl px-3 text-sm sm:w-40"
          defaultValue={state}
          name="state"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
        <button className="button button--primary" type="submit">
          Filtrar
        </button>
      </form>

      <FormPanel
        className="mb-4"
        description="Cadastre uma vez e aplique a vários clientes"
        title="Novo serviço"
      >
        <ServiceCatalogForm action={createCatalogService} />
      </FormPanel>

      {error ? (
        <p role="alert">Não foi possível carregar o catálogo.</p>
      ) : services?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <CatalogServiceCard
              key={service.id}
              service={service}
              usage={usageByService.get(service.id) ?? 0}
            />
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
