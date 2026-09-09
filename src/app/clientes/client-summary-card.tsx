"use client";

import type { Route } from "next";
import Link from "next/link";

import { restoreClient } from "@/app/clientes/actions";
import { ClientCardStatusMenu } from "@/app/clientes/client-card-status-menu";
import { Icon } from "@/components/ui/icon";
import { readClientLinks, type ClientLink } from "@/features/clients/schemas";
import { clientStatusInfo } from "@/features/clients/status";
import { formatCurrency } from "@/features/mvp/format";

export type ClientSummaryCardProps = {
  activeServices: number;
  clientId: string;
  email: string | null;
  entityCount: number;
  earned: number;
  expiringDomains: number;
  firstStart: string | null;
  links: unknown;
  name: string;
  notes: string | null;
  overdueCharges: number;
  phone: string | null;
  showingArchived: boolean;
  status: string;
  tenureLabel: string | null;
  tradeName: string | null;
  website: string | null;
};

/**
 * Card da lista: área vazia abre a ficha; indicadores e contatos são atalhos
 * próprios, com z-index acima do link esticado (sem âncoras aninhadas).
 */
export function ClientSummaryCard({
  activeServices,
  clientId,
  email,
  entityCount,
  earned,
  expiringDomains,
  firstStart,
  links,
  name,
  notes,
  overdueCharges,
  phone,
  showingArchived,
  status,
  tenureLabel,
  tradeName,
  website,
}: ClientSummaryCardProps) {
  const statusInfo = clientStatusInfo(status);
  const detailHref = `/clientes/${clientId}` as Route;
  const clientLinks = readClientLinks(links) as ClientLink[];
  const hasContact =
    Boolean(email) ||
    Boolean(phone) ||
    Boolean(website) ||
    Boolean(notes) ||
    clientLinks.length > 0;

  return (
    <article className="cartoon-card client-summary-card flex min-h-52 flex-col p-4 sm:p-5">
      <Link
        aria-label={`Abrir cliente ${name}`}
        className="client-summary-card__stretch"
        href={detailHref}
        tabIndex={-1}
      />
      <div className="client-summary-card__body">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-brand-soft text-brand-strong border-brand/20 grid size-11 place-items-center rounded-2xl border font-black">
            {name.slice(0, 1).toUpperCase()}
          </span>
          {showingArchived ? (
            <span className={statusInfo.className}>
              <Icon className="size-3.5" name={statusInfo.icon} />
              {statusInfo.label}
            </span>
          ) : (
            <ClientCardStatusMenu clientId={clientId} status={status} />
          )}
        </div>
        <Link
          className="hover:text-brand-strong mt-4 text-lg font-black tracking-[-0.02em]"
          href={detailHref}
        >
          {name}
        </Link>
        {tradeName ? <p className="text-muted mt-1 text-sm">{tradeName}</p> : null}
        <div className="client-card-signals" aria-label="Atalhos operacionais">
          <Link
            aria-label={`${activeServices} serviço(s) ativo(s). Abrir serviços`}
            className="client-card-signal"
            href={`/clientes/${clientId}#servicos`}
            title={`${activeServices} serviço(s) ativo(s)`}
          >
            <Icon name="briefcase" /> {activeServices}
          </Link>
          {entityCount ? (
            <Link
              aria-label={`${entityCount} empresa(s)/marca(s). Abrir empresas`}
              className="client-card-signal"
              href={`/clientes/${clientId}#empresas`}
              title="Empresas ou marcas cadastradas neste cliente"
            >
              <Icon name="building" /> {entityCount}{" "}
              {entityCount === 1 ? "empresa/marca" : "empresas/marcas"}
            </Link>
          ) : null}
          {overdueCharges ? (
            <Link
              aria-label={`${overdueCharges} cobrança(s) vencida(s). Abrir pendentes`}
              className="client-card-signal is-critical"
              href={`/cobrancas?clientId=${clientId}&state=pending`}
              title={`${overdueCharges} cobrança(s) vencida(s)`}
            >
              <Icon name="alert" /> {overdueCharges}
            </Link>
          ) : null}
          {expiringDomains ? (
            <Link
              aria-label={`${expiringDomains} domínio(s) vencendo. Abrir domínios`}
              className="client-card-signal is-warning"
              href={`/dominios?clientId=${clientId}&state=expiring`}
              title={`${expiringDomains} domínio(s) vencendo em até 30 dias`}
            >
              <Icon name="globe" /> {expiringDomains}
            </Link>
          ) : null}
          {firstStart && tenureLabel ? (
            <Link
              aria-label={`Cliente há ${tenureLabel}. Abrir serviços`}
              className="client-card-signal"
              href={`/clientes/${clientId}#servicos`}
              title="Tempo desde o primeiro serviço"
            >
              <Icon name="history" /> {tenureLabel}
            </Link>
          ) : null}
          {earned > 0 ? (
            <Link
              aria-label={`Já recebido ${formatCurrency(earned)}. Abrir cobranças pagas`}
              className="client-card-signal is-positive"
              href={`/cobrancas?clientId=${clientId}&state=paid`}
              title="Total já recebido deste cliente"
            >
              <Icon name="wallet" /> {formatCurrency(earned)}
            </Link>
          ) : null}
        </div>
        {hasContact ? (
          <div className="client-card-contact">
            {email ? (
              <a href={`mailto:${email}`} title={email}>
                <Icon className="size-3.5" name="mail" />
                <span className="truncate">{email}</span>
              </a>
            ) : null}
            {phone ? (
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} title={phone}>
                <Icon className="size-3.5" name="phone" />
                <span className="truncate">{phone}</span>
              </a>
            ) : null}
            {website ? (
              <a
                href={`https://${website}`}
                rel="noreferrer noopener"
                target="_blank"
                title={website}
              >
                <Icon className="size-3.5" name="globe" />
                <span className="truncate">{website}</span>
              </a>
            ) : null}
            {clientLinks.map((link) => (
              <a
                href={`https://${link.url}`}
                key={link.url}
                rel="noreferrer noopener"
                target="_blank"
                title={link.url}
              >
                <Icon className="size-3.5" name="link" />
                <span className="truncate">{link.label}</span>
              </a>
            ))}
            {notes ? (
              <Link
                className="client-card-contact__note"
                href={`/clientes/${clientId}#observacoes`}
              >
                <Icon className="size-3.5" name="info" />
                <span className="truncate">Tem observações</span>
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="border-line mt-auto flex items-center justify-between gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-brand-strong text-sm font-black" href={detailHref}>
              Abrir cliente →
            </Link>
            {!showingArchived ? (
              <Link
                className="text-muted hover:text-foreground text-xs font-bold"
                href={`/clientes/${clientId}?action=new-service#servicos`}
              >
                Novo serviço
              </Link>
            ) : null}
          </div>
          {showingArchived ? (
            <form action={restoreClient}>
              <input name="clientId" type="hidden" value={clientId} />
              <button
                className="text-muted hover:text-foreground text-xs font-bold"
                type="submit"
              >
                Desarquivar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
