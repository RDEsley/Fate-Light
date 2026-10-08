import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { FormPanel } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { readClientLinks } from "@/features/clients/schemas";
import { ownRevenue } from "@/features/mvp/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { deletePriorRevenueEntry, updateClient, updatePriorRevenueEntry } from "../../actions";
import { ClientForm } from "../../client-form";
import { PriorRevenueEntries } from "../../prior-revenue-entries";
import { ClientStatusMessage } from "../../status-message";
import { ClientEntityCard } from "../entity-card";
import { ClientEntityForm } from "../entity-form";

export const metadata: Metadata = { title: "Editar cliente" };

type EditClientPageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function EditClientPage({ params, searchParams }: EditClientPageProps) {
  const [{ clientId: rawClientId }, { status }, context] = await Promise.all([
    params,
    searchParams,
    requireWorkspaceContext(),
  ]);
  const clientId = z.string().uuid().safeParse(rawClientId);
  if (!clientId.success) notFound();

  const [
    { data: client, error },
    { data: priorRevenueCharges },
    { data: entityRows },
    { data: services },
    { data: charges },
    { data: domains },
  ] = await Promise.all([
    context.supabase
      .from("clients")
      .select(
        "id, name, trade_name, email, phone, website, links, commercial_status, notes, archived_at",
      )
      .eq("id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .single(),
    context.supabase
      .from("charges")
      .select("id, company_revenue, due_date")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .eq("payment_method", "Histórico")
      .is("client_service_id", null)
      .order("due_date", { ascending: false }),
    context.supabase
      .from("client_entities")
      .select(
        "id, display_name, entity_type, legal_name, tax_id, website, email, phone, notes, status, archived_at",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .order("display_name"),
    // Os três abaixo só alimentam os números de cada empresa/marca, então pedem apenas
    // o que tem vínculo: cliente sem entidade não paga por estas consultas.
    context.supabase
      .from("client_services")
      .select("client_entity_id, status")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .not("client_entity_id", "is", null),
    context.supabase
      .from("charges")
      .select(
        "client_entity_id, company_revenue, additional_fee, additional_fee_is_revenue, status",
      )
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .not("client_entity_id", "is", null),
    context.supabase
      .from("domains")
      .select("client_entity_id, status")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .not("client_entity_id", "is", null),
  ]);

  if (error || !client) notFound();
  if (client.archived_at) redirect(`/clientes/${client.id}`);

  const priorRevenueEntries = (priorRevenueCharges ?? []).map((charge) => ({
    amount: Number(charge.company_revenue),
    date: charge.due_date,
    id: charge.id,
  }));

  // Empresas/marcas do cliente (ADR-0020), com os sinais de cada cartão derivados das
  // listas já carregadas; nada aqui pede uma consulta por entidade.
  const entities = (entityRows ?? []).map((entity) => {
    const entityCharges = (charges ?? []).filter((charge) => charge.client_entity_id === entity.id);
    return {
      activeDomains: (domains ?? []).filter(
        (domain) => domain.client_entity_id === entity.id && domain.status === "active",
      ).length,
      activeServices: (services ?? []).filter(
        (service) => service.client_entity_id === entity.id && service.status === "active",
      ).length,
      archived: Boolean(entity.archived_at) || entity.status === "archived",
      displayName: entity.display_name,
      email: entity.email,
      entityType: entity.entity_type,
      id: entity.id,
      legalName: entity.legal_name,
      notes: entity.notes,
      paidRevenue: entityCharges
        .filter((charge) => charge.status === "paid")
        .reduce((total, charge) => total + ownRevenue(charge), 0),
      pendingCharges: entityCharges.filter((charge) => charge.status === "pending").length,
      phone: entity.phone,
      taxId: entity.tax_id,
      website: entity.website,
    };
  });
  const activeCount = entities.filter((entity) => !entity.archived).length;

  return (
    <AccountShell
      description="Cadastro, contatos e as empresas ou marcas deste cliente."
      title={`Editar ${client.name}`}
    >
      <ClientStatusMessage status={status} />
      <div className="mx-auto w-full max-w-4xl">
        <div className="page-toolbar">
          <Link className="button button--ghost button--small" href={`/clientes/${client.id}`}>
            <Icon className="size-4" name="arrow-left" /> Voltar para o cliente
          </Link>
        </div>

        <ClientForm
          action={updateClient}
          cancelHref={`/clientes/${client.id}` as Route}
          clientId={client.id}
          submitLabel="Salvar cliente"
          values={{
            companyName: client.trade_name,
            email: client.email,
            links: readClientLinks(client.links),
            name: client.name,
            notes: client.notes,
            phone: client.phone,
            status: client.commercial_status,
            website: client.website,
          }}
        />

        <p className="page-divider">
          <span>Também neste cliente</span>
        </p>

        {priorRevenueEntries.length ? (
          <section className="panel-card mb-4">
            <div className="section-heading mb-4">
              <span className="section-heading__icon bg-positive-soft text-positive">
                <Icon name="history" />
              </span>
              <div>
                <h2>Receita anterior já lançada</h2>
                <p>Valores recebidos antes do Fate Light. Corrija ou remova um lançamento.</p>
              </div>
            </div>
            <PriorRevenueEntries
              clientId={client.id}
              deleteAction={deletePriorRevenueEntry}
              entries={priorRevenueEntries}
              updateAction={updatePriorRevenueEntry}
            />
          </section>
        ) : null}

        <section className="panel-card" id="empresas">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="section-heading">
              <span className="section-heading__icon bg-violet-soft text-violet">
                <Icon name="building" />
              </span>
              <div>
                <h2>Empresas e marcas</h2>
                <p>
                  Separe as frentes deste cliente sem duplicar o cadastro. O vínculo é sempre
                  opcional.
                </p>
              </div>
            </div>
            {activeCount ? (
              <span className="entity-chip">
                {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
              </span>
            ) : null}
          </div>

          {entities.length ? (
            <div className="entity-grid mt-4">
              {entities.map((entity) => (
                <ClientEntityCard
                  clientId={client.id}
                  entity={entity}
                  key={entity.id}
                  returnTo="edit"
                />
              ))}
            </div>
          ) : null}

          <FormPanel
            className="mt-4"
            description="Para quando o cliente tem mais de um negócio sob o mesmo contrato"
            title="Nova empresa/marca"
            tone="violet"
          >
            <ClientEntityForm clientId={client.id} returnTo="edit" />
          </FormPanel>
        </section>
      </div>
    </AccountShell>
  );
}
