import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { Icon } from "@/components/ui/icon";
import { getAttentionItems } from "@/features/alerts/attention";
import { addDays, isoToday } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage() {
  const context = await requireWorkspaceContext();
  const items = await getAttentionItems(context);
  const urgent = items.filter(({ severity }) => severity === "danger");
  const upcoming = items.filter(({ severity }) => severity === "warning");
  // "Esta semana" recorta os próximos sete dias dentro do que já está no radar, sem
  // consultar o banco de novo. Lê `item.date`, não o texto do `meta`: as despesas
  // formatam o meta sem o separador "·" e nenhuma delas era reconhecida aqui.
  const weekLimit = addDays(isoToday(), 7);
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
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard color="negative" label="Atrasados" value={urgent.length} />
        <SummaryCard color="warning" label="Esta semana" value={thisWeek.length} />
        <SummaryCard color="warning" label="Próximos" value={upcoming.length} />
        <SummaryCard color="brand" label="Total aberto" value={items.length} />
      </div>

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
  items: Awaited<ReturnType<typeof getAttentionItems>>;
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
          <article className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" key={item.id}>
            <span
              className={`${item.severity === "danger" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning"} grid size-10 shrink-0 place-items-center rounded-xl border border-current/20`}
            >
              <Icon name="alert" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">{item.title}</h3>
              <p className="text-muted mt-1 text-sm">{item.meta}</p>
            </div>
            <Link
              className="text-brand-strong hover:bg-brand-soft min-h-10 rounded-xl px-4 py-2 text-center text-sm font-black"
              href={item.href}
            >
              Abrir origem
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
