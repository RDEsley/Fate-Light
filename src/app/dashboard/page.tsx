import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  addDays,
  dashboardPeriodBounds,
  formatCurrency,
  formatDatePtBr,
  isoDateInTimeZone,
  type DashboardPeriod,
} from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { FinancialPrivacy } from "./financial-privacy";

export const metadata: Metadata = { title: "Dashboard" };

const periods = [
  { label: "Todo o período", value: "all" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "Este mês", value: "month" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ period: requestedPeriod }, context] = await Promise.all([
    searchParams,
    requireWorkspaceContext(),
  ]);
  const period: DashboardPeriod = periods.some(({ value }) => value === requestedPeriod)
    ? (requestedPeriod as DashboardPeriod)
    : "month";
  const today = isoDateInTimeZone(context.workspaceTimezone);
  const { dueEnd, end, start } = dashboardPeriodBounds(period, today);
  const nextWeek = addDays(today, 7);
  const nextMonth = addDays(today, 30);
  // O PostgREST corta a resposta em `max_rows` (1000). Uma consulta sem recorte de data
  // devolvia "as primeiras mil cobranças" e os totais do painel passavam a mentir em
  // silêncio assim que o workspace crescia. Cada consulta abaixo pede só o que a página
  // realmente lê, e o horizonte das pendentes vai até o maior entre o fim do período e a
  // janela de 7 dias — os dois recortes que os cards mostram.
  const chargeColumns = "id, description, due_date, clients(name)";
  const [
    { data: summary, error: summaryError },
    { data: overdueRows, error: overdueError },
    { data: dueSoonRows, error: dueSoonError },
    { data: overdueExpenseRows, error: overdueExpensesError },
    { data: expiredDomainRows, error: expiredDomainsError },
    { data: upcomingDomainRows, error: upcomingDomainsError },
  ] = await Promise.all([
    context.supabase
      .rpc("dashboard_financial_summary", {
        p_due_end: dueEnd,
        p_end: end,
        p_next_month: nextMonth,
        p_next_week: nextWeek,
        p_start: start,
        p_today: today,
        p_workspace_id: context.workspaceId,
      })
      .maybeSingle(),
    context.supabase
      .from("charges")
      .select(chargeColumns)
      .eq("workspace_id", context.workspaceId)
      .eq("status", "pending")
      .lt("due_date", today)
      .order("due_date")
      .limit(4),
    context.supabase
      .from("charges")
      .select(chargeColumns)
      .eq("workspace_id", context.workspaceId)
      .eq("status", "pending")
      .gte("due_date", today)
      .lte("due_date", nextWeek)
      .order("due_date")
      .limit(4),
    context.supabase
      .from("expenses")
      .select("id, description, amount, due_date")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "pending")
      .lt("due_date", today)
      .order("due_date")
      .limit(4),
    context.supabase
      .from("domains")
      .select("id, domain, expires_on, clients(name)")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .lt("expires_on", today)
      .order("expires_on")
      .limit(4),
    context.supabase
      .from("domains")
      .select("id, domain, expires_on, clients(name)")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "active")
      .gte("expires_on", today)
      .lte("expires_on", nextMonth)
      .order("expires_on")
      .limit(4),
  ]);

  const ownReceived = Number(summary?.own_received ?? 0);
  const ownPending = Number(summary?.own_pending ?? 0);
  const mediaPeriod = Number(summary?.media_period ?? 0);
  const expensesPaid = Number(summary?.expenses_paid ?? 0);
  const result = ownReceived - expensesPaid;
  const overdue = overdueRows ?? [];
  const dueSoon = dueSoonRows ?? [];
  const overdueExpenses = overdueExpenseRows ?? [];
  const expiredDomains = expiredDomainRows ?? [];
  const upcomingDomains = upcomingDomainRows ?? [];
  const overdueCount = Number(summary?.overdue_charges ?? 0);
  const dueSoonCount = Number(summary?.due_soon_charges ?? 0);
  const overdueExpensesCount = Number(summary?.overdue_expenses ?? 0);
  const expiredDomainsCount = Number(summary?.expired_domains ?? 0);
  const upcomingDomainsCount = Number(summary?.upcoming_domains ?? 0);
  const attentionTotal =
    overdueCount + dueSoonCount + overdueExpensesCount + expiredDomainsCount + upcomingDomainsCount;
  const hasError = Boolean(
    summaryError ||
    overdueError ||
    dueSoonError ||
    overdueExpensesError ||
    expiredDomainsError ||
    upcomingDomainsError,
  );
  const maxFlow = Math.max(ownReceived, mediaPeriod, expensesPaid, Math.abs(result), 1);
  const firstName = context.fullName.trim().split(/\s+/)[0] || context.fullName;

  return (
    <AccountShell
      description={`Você está em ${context.workspaceName}. Veja o que precisa de ação e como o período está se comportando.`}
      title={`Olá, ${firstName}!`}
    >
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border-2 border-slate-700/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 px-1">
          <span className="bg-brand-soft text-brand-strong grid size-10 place-items-center rounded-xl">
            <Icon name="calendar" />
          </span>
          <div>
            <p className="text-xs font-black tracking-wide uppercase">Período analisado</p>
            <p className="text-muted text-xs">
              {period === "all"
                ? "Desde o primeiro registro"
                : start.split("-").reverse().join("/")}{" "}
              — {end.split("-").reverse().join("/")}
            </p>
          </div>
        </div>
        <nav
          aria-label="Período do dashboard"
          className="grid grid-cols-2 gap-1 rounded-xl bg-[#eef1ed] p-1 sm:flex sm:flex-wrap"
        >
          {periods.map((option) => (
            <Link
              aria-current={period === option.value ? "page" : undefined}
              className={`${period === option.value ? "border-line-strong text-foreground bg-white shadow-sm" : "text-muted hover:text-foreground"} rounded-lg border border-transparent px-3 py-2 text-center text-xs font-black`}
              href={`/dashboard?period=${option.value}` as Route}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      {hasError ? (
        <div
          className="bg-negative-soft text-negative border-negative/25 mb-5 flex items-start gap-3 rounded-2xl border-2 p-4"
          role="alert"
        >
          <Icon className="mt-0.5 size-5 shrink-0" name="alert" />
          <div>
            <strong className="block">Alguns dados não chegaram.</strong>
            <p className="mt-1 text-sm">Atualize a página. Se continuar, verifique sua conexão.</p>
          </div>
        </div>
      ) : null}

      <FinancialPrivacy>
        <section
          className={`${attentionTotal ? "bg-warning-soft border-warning/30" : "bg-positive-soft border-positive/25"} mb-5 overflow-hidden rounded-2xl border-2 p-4 sm:p-5`}
          aria-labelledby="attention-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className={`${attentionTotal ? "bg-warning text-white" : "bg-positive text-white"} grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-slate-700/20 shadow-[2px_2px_0_rgba(37,50,58,.12)]`}
              >
                <Icon name={attentionTotal ? "bell" : "check"} />
              </span>
              <div>
                <p className="text-xs font-black tracking-[.12em] uppercase">Precisa de atenção</p>
                <h2 className="mt-1 text-xl font-black" id="attention-title">
                  {attentionTotal
                    ? `${attentionTotal} item${attentionTotal === 1 ? "" : "s"} no seu radar`
                    : "Nenhuma urgência agora"}
                </h2>
                <p className="text-muted mt-1 text-sm">
                  {attentionTotal
                    ? `${overdueCount + overdueExpensesCount + expiredDomainsCount} atrasado(s) e ${dueSoonCount + upcomingDomainsCount} próximo(s).`
                    : "Tudo em dia. Aproveite para planejar o próximo passo."}
                </p>
              </div>
            </div>
            <Link
              className="border-warning/40 hover:bg-warning-soft min-h-11 rounded-xl border-2 bg-white px-4 py-2.5 text-center text-sm font-black"
              href="/alertas"
            >
              Abrir central de alertas
            </Link>
          </div>
        </section>

        <section
          aria-label="Resumo financeiro"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          data-animate="stagger"
        >
          <KpiCard
            href="/cobrancas?state=paid"
            icon="arrow-up"
            label="Receita própria recebida"
            tone="positive"
            value={formatCurrency(ownReceived)}
            helper="Caixa · pagamentos confirmados"
          />
          <KpiCard
            href="/cobrancas?state=pending"
            icon="receipt"
            label="Receita própria pendente"
            tone="warning"
            value={formatCurrency(ownPending)}
            helper="Cobranças abertas no período"
          />
          <KpiCard
            href="/despesas?state=paid"
            icon="arrow-down"
            label="Despesas pagas"
            tone="negative"
            value={formatCurrency(expensesPaid)}
            helper="Custos pagos no período"
          />
          <KpiCard
            href="/historico"
            icon={result >= 0 ? "sparkles" : "alert"}
            label="Resultado gerencial"
            tone={result >= 0 ? "positive" : "negative"}
            value={formatCurrency(result)}
            helper="Receita própria menos despesas"
            prominent
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
          <section className="panel-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="section-heading">
                <span className="section-heading__icon bg-violet-soft text-violet">
                  <Icon name="dashboard" />
                </span>
                <div>
                  <h2>Movimento do período</h2>
                  <p>Comparação visual sem misturar as naturezas financeiras.</p>
                </div>
              </div>
              <span className="bg-violet-soft text-violet rounded-full px-3 py-1 text-xs font-black">
                {periods.find(({ value }) => value === period)?.label}
              </span>
            </div>
            <div className="mt-7 space-y-5">
              <FlowBar color="brand" label="Receita própria" max={maxFlow} value={ownReceived} />
              <FlowBar color="violet" label="Verba e repasses" max={maxFlow} value={mediaPeriod} />
              <FlowBar color="negative" label="Despesas pagas" max={maxFlow} value={expensesPaid} />
              <FlowBar
                color={result >= 0 ? "positive" : "negative"}
                label="Resultado"
                max={maxFlow}
                value={Math.abs(result)}
                displayValue={result}
              />
            </div>
            <p className="helper-note mt-6">
              <Icon className="size-4 shrink-0" name="alert" /> Verba de mídia é apresentada
              separadamente e não compõe o resultado da empresa.
            </p>
          </section>

          <section className="panel-card">
            <div className="section-heading">
              <span className="section-heading__icon bg-brand-soft text-brand-strong">
                <Icon name="plus" />
              </span>
              <div>
                <h2>Ações rápidas</h2>
                <p>Atalhos para a rotina de hoje.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2" data-animate="stagger">
              <QuickAction href="/clientes/novo" icon="users" label="Novo cliente" color="brand" />
              <QuickAction href="/cobrancas" icon="receipt" label="Nova cobrança" color="warning" />
              <QuickAction href="/despesas" icon="wallet" label="Nova despesa" color="negative" />
              <QuickAction
                href="/dominios"
                icon="globe"
                label="Acompanhar domínio"
                color="violet"
              />
            </div>
            <Link
              className="mt-5 block rounded-xl bg-[#f1f3ef] p-4 hover:bg-[#e9ece5]"
              href="/clientes?state=active"
            >
              <p className="text-muted text-xs font-bold uppercase">Clientes ativos</p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {summary?.active_clients ?? 0}
              </p>
            </Link>
          </section>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <AlertList
            empty="Nenhuma cobrança vencida."
            href="/cobrancas"
            items={overdue.map(
              (charge) =>
                `${charge.clients?.name ?? "Cliente"} — ${charge.description} (${formatDatePtBr(charge.due_date)})`,
            )}
            title={`Cobranças vencidas (${overdueCount})`}
            tone="danger"
          />
          <AlertList
            empty="Nenhuma cobrança nos próximos 7 dias."
            href="/cobrancas"
            items={dueSoon.map(
              (charge) =>
                `${charge.clients?.name ?? "Cliente"} — ${charge.description} (${formatDatePtBr(charge.due_date)})`,
            )}
            title={`Próximos 7 dias (${dueSoonCount})`}
            tone="warning"
          />
          <AlertList
            empty="Nenhuma despesa vencida."
            href="/despesas?state=pending"
            items={overdueExpenses.map(
              (expense) =>
                `${expense.description} — ${formatCurrency(expense.amount)} (${formatDatePtBr(expense.due_date)})`,
            )}
            title={`Despesas vencidas (${overdueExpensesCount})`}
            tone="danger"
          />
          <AlertList
            empty="Nenhum domínio vencido."
            href="/dominios"
            items={expiredDomains.map(
              (domain) => `${domain.domain} — ${domain.clients?.name ?? "Cliente"}`,
            )}
            title={`Domínios vencidos (${expiredDomainsCount})`}
            tone="danger"
          />
          <AlertList
            empty="Nenhum domínio expira nos próximos 30 dias."
            href="/dominios"
            items={upcomingDomains.map(
              (domain) => `${domain.domain} — ${formatDatePtBr(domain.expires_on)}`,
            )}
            title={`Domínios nos próximos 30 dias (${upcomingDomainsCount})`}
            tone="warning"
          />
        </div>
      </FinancialPrivacy>
    </AccountShell>
  );
}

function KpiCard({
  helper,
  href,
  icon,
  label,
  prominent,
  tone,
  value,
}: {
  helper: string;
  href: Route;
  icon: IconName;
  label: string;
  prominent?: boolean;
  tone: "negative" | "positive" | "warning";
  value: string;
}) {
  const colors = {
    negative: "bg-negative-soft text-negative",
    positive: "bg-positive-soft text-positive",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <Link
      className={`cartoon-card block p-4 sm:p-5 ${prominent ? "border-brand-strong/40" : ""}`}
      href={href}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted text-xs font-bold">{label}</p>
        <span className={`${colors[tone]} grid size-9 place-items-center rounded-xl`}>
          <Icon className="size-4" name={icon} />
        </span>
      </div>
      <p
        data-financial-value
        className={`${tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : "text-foreground"} mt-4 text-2xl font-black tracking-[-0.035em] tabular-nums`}
      >
        {value}
      </p>
      <p className="text-muted mt-2 text-xs">{helper}</p>
    </Link>
  );
}

function FlowBar({
  color,
  displayValue,
  label,
  max,
  value,
}: {
  color: "brand" | "negative" | "positive" | "violet";
  displayValue?: number;
  label: string;
  max: number;
  value: number;
}) {
  const colors = {
    brand: "bg-brand",
    negative: "bg-negative",
    positive: "bg-positive",
    violet: "bg-violet",
  };
  const width = Math.max(value ? 6 : 0, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold">{label}</span>
        <strong className="tabular-nums" data-financial-value>
          {formatCurrency(displayValue ?? value)}
        </strong>
      </div>
      <div className="border-line h-3 overflow-hidden rounded-full border bg-[#edf0ec]">
        <span
          className={`${colors[color]} block h-full rounded-full`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  color,
  href,
  icon,
  label,
}: {
  color: "brand" | "negative" | "violet" | "warning";
  href: Route;
  icon: IconName;
  label: string;
}) {
  const colors = {
    brand: "bg-brand-soft text-brand-strong",
    negative: "bg-negative-soft text-negative",
    violet: "bg-violet-soft text-violet",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <Link
      className="quick-action hover:border-line flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-2 font-bold hover:bg-[#f1f3ef]"
      href={href}
    >
      <span className={`${colors[color]} grid size-9 place-items-center rounded-xl`}>
        <Icon className="size-4" name={icon} />
      </span>
      <span>{label}</span>
      <span aria-hidden="true" className="text-muted ml-auto">
        →
      </span>
    </Link>
  );
}

function AlertList({
  empty,
  href,
  items,
  title,
  tone,
}: {
  empty: string;
  href: Route;
  items: string[];
  title: string;
  tone: "danger" | "warning";
}) {
  return (
    <section className="panel-card p-0!">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`${tone === "danger" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning"} grid size-8 place-items-center rounded-lg`}
          >
            <Icon className="size-4" name="alert" />
          </span>
          <h2 className="font-black">{title}</h2>
        </div>
        <Link className="text-brand-strong text-xs font-black" href={href}>
          Ver todos
        </Link>
      </div>
      {items.length ? (
        <ul className="divide-line divide-y px-5">
          {items.slice(0, 4).map((item) => (
            <li className="py-3 text-sm" key={item}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted p-5 text-sm">{empty}</p>
      )}
    </section>
  );
}
