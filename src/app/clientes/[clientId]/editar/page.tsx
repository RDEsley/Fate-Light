import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { parseClientAddress } from "@/features/clients/address";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { updateClient } from "../../actions";
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

  const { data: client, error } = await context.supabase
    .from("clients")
    .select(
      "id, kind, name, trade_name, tax_id, address_json, commercial_status, notes, tags, responsible_name, archived_at",
    )
    .eq("id", clientId.data)
    .eq("workspace_id", context.workspaceId)
    .single();

  if (error || !client) notFound();
  if (client.archived_at) redirect(`/clientes/${client.id}`);

  return (
    <AccountShell
      description="Altere somente o cadastro operacional. Histórico e autoria são preservados automaticamente."
      fullName={context.fullName}
      theme={context.theme}
      title={`Editar ${client.name}`}
    >
      <ClientStatusMessage status={status} />
      <section className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8">
        <ClientForm
          action={updateClient}
          cancelHref={`/clientes/${client.id}` as Route}
          clientId={client.id}
          submitLabel="Salvar cliente"
          values={{
            address: parseClientAddress(client.address_json),
            commercialStatus: client.commercial_status,
            kind: client.kind,
            name: client.name,
            notes: client.notes,
            responsibleName: client.responsible_name,
            tags: client.tags,
            taxId: client.tax_id,
            tradeName: client.trade_name,
          }}
        />
      </section>
    </AccountShell>
  );
}
