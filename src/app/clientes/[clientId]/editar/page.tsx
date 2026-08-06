import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { readClientLinks } from "@/features/clients/schemas";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { deletePriorRevenueEntry, updateClient, updatePriorRevenueEntry } from "../../actions";
import { ClientForm } from "../../client-form";
import { ClientStatusMessage } from "../../status-message";

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

  const [{ data: client, error }, { data: priorRevenueCharges }] = await Promise.all([
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
  ]);

  if (error || !client) notFound();
  if (client.archived_at) redirect(`/clientes/${client.id}`);

  return (
    <AccountShell
      description="Altere somente o cadastro operacional. Histórico e autoria são preservados automaticamente."
      title={`Editar ${client.name}`}
    >
      <ClientStatusMessage status={status} />
      <div className="mx-auto w-full max-w-4xl">
        <ClientForm
          action={updateClient}
          cancelHref={`/clientes/${client.id}` as Route}
          clientId={client.id}
          deletePriorRevenueAction={deletePriorRevenueEntry}
          priorRevenueEntries={(priorRevenueCharges ?? []).map((charge) => ({
            amount: Number(charge.company_revenue),
            date: charge.due_date,
            id: charge.id,
          }))}
          submitLabel="Salvar cliente"
          updatePriorRevenueAction={updatePriorRevenueEntry}
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
      </div>
    </AccountShell>
  );
}
