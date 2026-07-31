import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AccountShell } from "@/app/_components/account-shell";
import { formatClientAddress, parseClientAddress } from "@/features/clients/address";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import {
  archiveClient,
  archiveContact,
  createContact,
  restoreClient,
  updateContact,
} from "../actions";
import { ContactForm } from "../contact-form";
import { ClientStatusMessage } from "../status-message";

export const metadata: Metadata = { title: "Detalhes do cliente" };

const identifierSchema = z.string().uuid();
const statusLabels: Record<string, string> = {
  active: "Ativo",
  archived: "Arquivado",
  inactive: "Inativo",
  lead: "Lead",
  paused: "Pausado",
};

type ClientDetailsPageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function ClientDetailsPage({ params, searchParams }: ClientDetailsPageProps) {
  const [{ clientId: rawClientId }, { status }, context] = await Promise.all([
    params,
    searchParams,
    requireWorkspaceContext(),
  ]);
  const clientId = identifierSchema.safeParse(rawClientId);
  if (!clientId.success) notFound();

  const [{ data: client, error }, { data: contacts, error: contactsError }] = await Promise.all([
    context.supabase
      .from("clients")
      .select(
        "id, kind, name, trade_name, tax_id, address_json, commercial_status, notes, tags, responsible_name, archived_at, created_at, updated_at",
      )
      .eq("id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .single(),
    context.supabase
      .from("client_contacts")
      .select("id, name, email, phone, role, is_primary, archived_at")
      .eq("client_id", clientId.data)
      .eq("workspace_id", context.workspaceId)
      .order("is_primary", { ascending: false })
      .order("name"),
  ]);

  if (error || contactsError || !client) notFound();

  const address = parseClientAddress(client.address_json);
  const addressLines = formatClientAddress(address);
  const isArchived = Boolean(client.archived_at);

  return (
    <AccountShell
      description="Visão operacional do relacionamento. Dados financeiros e módulos futuros aparecem apenas como estados derivados ou placeholders."
      fullName={context.fullName}
      theme={context.theme}
      title={client.name}
    >
      <ClientStatusMessage status={status} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="font-semibold hover:underline" href="/clientes">
          ← Voltar para clientes
        </Link>
        <div className="flex flex-wrap gap-3">
          {!isArchived ? (
            <>
              <Link
                className="border-line hover:bg-brand-soft rounded-xl border px-4 py-2 font-semibold"
                href={`/clientes/${client.id}/editar`}
              >
                Editar
              </Link>
              <form action={archiveClient}>
                <input name="clientId" type="hidden" value={client.id} />
                <button
                  className="border-line hover:bg-brand-soft rounded-xl border px-4 py-2 font-semibold"
                  type="submit"
                >
                  Arquivar
                </button>
              </form>
            </>
          ) : (
            <form action={restoreClient}>
              <input name="clientId" type="hidden" value={client.id} />
              <button
                className="bg-brand text-brand-contrast rounded-xl px-4 py-2 font-semibold"
                type="submit"
              >
                Restaurar como ativo
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Visão geral</h2>
            <span className="bg-brand-soft text-brand-strong rounded-full px-3 py-1 text-xs font-semibold">
              {statusLabels[client.commercial_status] ?? "Em análise"}
            </span>
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-muted text-sm">Tipo</dt>
              <dd className="mt-1 font-semibold">
                {client.kind === "company" ? "Empresa" : "Pessoa"}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Situação financeira</dt>
              <dd className="mt-1 font-semibold">Sem cobrança aberta</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Nome comercial</dt>
              <dd className="mt-1">{client.trade_name ?? "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Responsável</dt>
              <dd className="mt-1">{client.responsible_name ?? "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">CPF/CNPJ</dt>
              <dd className="mt-1">{client.tax_id ?? "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Tags</dt>
              <dd className="mt-1">{client.tags.length ? client.tags.join(" · ") : "Sem tags"}</dd>
            </div>
          </dl>
          <div className="border-line mt-6 border-t pt-6">
            <h3 className="font-semibold">Endereço</h3>
            {addressLines.length ? (
              <address className="text-muted mt-2 space-y-1 text-sm not-italic">
                {addressLines.map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <p className="text-muted mt-2 text-sm">Não informado.</p>
            )}
          </div>
          <div className="border-line mt-6 border-t pt-6">
            <h3 className="font-semibold">Observações</h3>
            <p className="text-muted mt-2 text-sm leading-6 whitespace-pre-wrap">
              {client.notes ?? "Sem observações."}
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          {[
            "Contratos e serviços",
            "Cobranças e pagamentos",
            "Custos e despesas",
            "Domínios e anexos",
          ].map((label) => (
            <section className="border-line bg-surface rounded-2xl border p-5" key={label}>
              <h2 className="font-semibold">{label}</h2>
              <p className="text-muted mt-2 text-sm">
                Módulo ainda não iniciado. Nenhum total fictício é exibido.
              </p>
            </section>
          ))}
        </aside>
      </div>

      <section className="border-line bg-surface mt-6 rounded-2xl border p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Contatos</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {contacts?.length ? (
            contacts.map((contact) => (
              <article className="border-line rounded-xl border p-5" key={contact.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{contact.name}</h3>
                  <div className="flex gap-2 text-xs font-semibold">
                    {contact.is_primary ? (
                      <span className="bg-brand-soft text-brand-strong rounded-full px-2 py-1">
                        Principal
                      </span>
                    ) : null}
                    {contact.archived_at ? (
                      <span className="border-line rounded-full border px-2 py-1">Arquivado</span>
                    ) : null}
                  </div>
                </div>
                <p className="text-muted mt-2 text-sm">{contact.role ?? "Função não informada"}</p>
                <p className="mt-3 text-sm">{contact.email ?? "Sem e-mail"}</p>
                <p className="mt-1 text-sm">{contact.phone ?? "Sem telefone"}</p>
                {!isArchived && !contact.archived_at ? (
                  <details className="border-line mt-4 border-t pt-4">
                    <summary className="cursor-pointer font-semibold">Editar contato</summary>
                    <div className="mt-4">
                      <ContactForm
                        action={updateContact}
                        clientId={client.id}
                        contactId={contact.id}
                        submitLabel="Salvar contato"
                        values={{
                          email: contact.email,
                          isPrimary: contact.is_primary,
                          name: contact.name,
                          phone: contact.phone,
                          role: contact.role,
                        }}
                      />
                      <form action={archiveContact} className="mt-3">
                        <input name="clientId" type="hidden" value={client.id} />
                        <input name="contactId" type="hidden" value={contact.id} />
                        <button className="text-sm font-semibold hover:underline" type="submit">
                          Arquivar contato
                        </button>
                      </form>
                    </div>
                  </details>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-muted text-sm">Nenhum contato cadastrado.</p>
          )}
        </div>

        {!isArchived ? (
          <details className="border-line mt-6 border-t pt-5">
            <summary className="cursor-pointer font-semibold">Adicionar contato</summary>
            <div className="mt-5 max-w-2xl">
              <ContactForm action={createContact} clientId={client.id} />
            </div>
          </details>
        ) : null}
      </section>
    </AccountShell>
  );
}
