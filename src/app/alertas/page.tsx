import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { SubmitButton } from "@/app/_components/submit-button";
import { Icon } from "@/components/ui/icon";
import { DateField } from "@/components/ui/form-controls";
import { SelectField } from "@/components/ui/select-field";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { getAttentionItems } from "@/features/alerts/attention";
import { addDays, isoDateInTimeZone } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { createManualAlert, resolveManualAlert } from "./actions";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const context = await requireWorkspaceContext();
  const attention = await getAttentionItems(context);
  const items = attention.items;
  const urgent = items.filter(({ severity }) => severity === "danger");
  const upcoming = items.filter(({ severity }) => severity === "warning");
  // "Esta semana" recorta os próximos sete dias dentro do que já está no radar, sem
  // consultar o banco de novo. Lê `item.date`, não o texto do `meta`: as despesas
  // formatam o meta sem o separador "·" e nenhuma delas era reconhecida aqui.
  const weekLimit = addDays(isoDateInTimeZone(context.workspaceTimezone), 7);
  const thisWeek = upcoming.filter((item) => item.date <= weekLimit);

  return (
    <AccountShell
      actions={
        <Link
          className="border-line bg-surface hover:bg-brand-soft inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold"
          href="/configuracoes/empresa#alertas"
        >
          <Icon className="size-4" name="settings" /> Config. de alertas
        </Link>
      }
      description="Veja o que venceu e o que está chegando antes de virar um problema."
      title="Central de alertas"
    >
      {status ? (
        <FeedbackBanner
          message={
            status === "created"
              ? "Alerta criado. Ele já está no seu radar."
              : status === "resolved"
                ? "Alerta resolvido e retirado da lista aberta."
                : status === "invalid"
                  ? "Revise o título, a data e a prioridade."
                  : "Não foi possível salvar o alerta. Tente novamente."
          }
          tone={status === "created" || status === "resolved" ? "success" : "error"}
        />
      ) : null}
      <details className="panel-card form-disclosure mb-5">
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-brand-soft text-brand-strong grid size-9 place-items-center rounded-xl">
              <Icon className="size-4" name="plus" />
            </span>
            Criar alerta avulso
          </span>
          <span className="text-muted text-xs">Lembrete interno</span>
        </summary>
        <form action={createManualAlert} className="form-grid mt-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field__label">Título</span>
            <input maxLength={120} name="title" required />
          </label>
          <DateField label="Data do alerta" name="dueOn" required />
          <SelectField
            defaultValue="warning"
            label="Prioridade"
            name="severity"
            options={[
              { label: "Atenção", value: "warning" },
              { label: "Urgente", value: "danger" },
            ]}
          />
          <label className="field sm:col-span-2">
            <span className="field__label">
              Observação <span className="field__optional">opcional</span>
            </span>
            <textarea maxLength={1000} name="notes" rows={2} />
          </label>
          <div className="sm:col-span-2 sm:justify-self-end">
            <SubmitButton idleLabel="Criar alerta" pendingLabel="Criando…" />
          </div>
        </form>
      </details>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard color="negative" label="Atrasados" value={urgent.length} />
        <SummaryCard color="warning" label="Esta semana" value={thisWeek.length} />
        <SummaryCard color="warning" label="Próximos" value={upcoming.length} />
        <SummaryCard color="brand" label="Total aberto" value={attention.total} />
      </div>
      {attention.total > items.length ? (
        <p className="helper-note mb-5" role="status">
          <Icon className="size-4" name="info" />
          Há {attention.total} alertas abertos. A tela exibe primeiro os {items.length} de maior
          prioridade; resolva os itens atendidos para avançar pela fila.
        </p>
      ) : null}

      {items.length ? (
        <div className="space-y-6">
          <AlertGroup items={urgent} title="Precisa de ação agora" />
          <AlertGroup items={thisWeek} title="Esta semana" />
          <AlertGroup
            items={upcoming.filter((item) => !thisWeek.includes(item))}
            title="Mais adiante"
          />
        </div>
      ) : (
        <section className="panel-card py-12 text-center">
          <span className="bg-positive-soft text-positive border-positive/25 mx-auto grid size-14 place-items-center rounded-2xl border-2">
            <Icon className="size-7" name="check" />
          </span>
          <h2 className="mt-4 text-xl font-black">Tudo em dia por aqui</h2>
          <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-6">
            Quando uma cobrança, despesa ou domínio se aproximar do vencimento, ele aparecerá aqui.
          </p>
        </section>
      )}
    </AccountShell>
  );
}

function SummaryCard({
  color,
  label,
  value,
}: {
  color: "brand" | "negative" | "warning";
  label: string;
  value: number;
}) {
  const tones = {
    brand: "bg-brand-soft text-brand-strong border-brand/25",
    negative: "bg-negative-soft text-negative border-negative/25",
    warning: "bg-warning-soft text-warning border-warning/25",
  };
  return (
    <article className={`cartoon-card flex items-center justify-between p-4 ${tones[color]}`}>
      <span className="text-sm font-bold">{label}</span>
      <strong className="text-2xl font-black tabular-nums">{value}</strong>
    </article>
  );
}

function AlertGroup({
  items,
  title,
}: {
  items: Awaited<ReturnType<typeof getAttentionItems>>["items"];
  title: string;
}) {
  if (!items.length) return null;
  return (
    <section className="panel-card p-0!">
      <div className="border-b px-5 py-4">
        <h2 className="font-black">{title}</h2>
      </div>
      <div className="divide-line divide-y">
        {items.map((item) => (
          <article
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            id={item.id}
            key={item.id}
          >
            <span
              className={`${item.severity === "danger" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning"} grid size-10 shrink-0 place-items-center rounded-xl border border-current/20`}
            >
              <Icon name="alert" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">{item.title}</h3>
              <p className="text-muted mt-1 text-sm">{item.meta}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="text-violet hover:bg-violet-soft min-h-10 rounded-xl px-3 py-2 text-center text-sm font-black"
                href={googleCalendarUrl(item.title, item.meta, item.date)}
                rel="noreferrer"
                target="_blank"
              >
                Google Agenda
              </a>
              {item.source === "manual" ? (
                <form action={resolveManualAlert}>
                  <input name="id" type="hidden" value={item.id.replace("manual-", "")} />
                  <SubmitButton idleLabel="Marcar resolvido" pendingLabel="Resolvendo…" />
                </form>
              ) : (
                <Link
                  className="text-brand-strong hover:bg-brand-soft min-h-10 rounded-xl px-4 py-2 text-center text-sm font-black"
                  href={item.href}
                >
                  Abrir origem
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function googleCalendarUrl(title: string, details: string, date: string) {
  const compactDate = date.replaceAll("-", "");
  const compactEndDate = addDays(date, 1).replaceAll("-", "");
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${compactDate}/${compactEndDate}`,
    details,
    text: title,
  });
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}
