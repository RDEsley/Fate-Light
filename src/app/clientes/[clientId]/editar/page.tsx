import type { Metadata } from "next";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
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
    .select("id, name, trade_name, email, phone, website, commercial_status, notes, archived_at")
    .eq("id", clientId.data)
    .eq("workspace_id", context.workspaceId)
    .single();

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
          submitLabel="Salvar cliente"
          values={{
            companyName: client.trade_name,
            email: client.email,
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
