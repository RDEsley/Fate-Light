import type { Metadata } from "next";

import { AccountShell } from "@/app/_components/account-shell";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { createClient } from "../actions";
import { ClientForm } from "../client-form";
import { ClientStatusMessage } from "../status-message";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status }] = await Promise.all([searchParams, requireWorkspaceContext()]);

  return (
    <AccountShell
      description="Cadastre os dados essenciais para iniciar o atendimento e as cobranças."
      title="Novo cliente"
    >
      <ClientStatusMessage status={status} />
      <div className="mx-auto w-full max-w-4xl">
        <ClientForm action={createClient} cancelHref="/clientes" submitLabel="Criar cliente" />
      </div>
    </AccountShell>
  );
}
