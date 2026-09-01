"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useState, type ReactNode } from "react";

import { signOut } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { Icon, type IconName } from "@/components/ui/icon";
import type { AttentionItem } from "@/features/alerts/attention";
import { getInitials } from "@/lib/profile/initials";

import { ProductTour } from "./product-tour";

const navigation: { href: Route; icon: IconName; label: string }[] = [
  { href: "/dashboard", icon: "dashboard", label: "Visão geral" },
  { href: "/clientes", icon: "users", label: "Clientes" },
  { href: "/servicos", icon: "briefcase", label: "Serviços" },
  { href: "/cobrancas", icon: "receipt", label: "Cobranças" },
  { href: "/despesas", icon: "wallet", label: "Despesas" },
  { href: "/dominios", icon: "globe", label: "Domínios" },
  { href: "/alertas", icon: "bell", label: "Alertas" },
  { href: "/importar", icon: "upload", label: "Importar dados" },
];

export function AppFrame({
  actions,
  attentionItems,
  attentionTotal,
  children,
  description,
  fullName,
  title,
  workspaceName,
}: {
  actions?: ReactNode;
  attentionItems: AttentionItem[];
  attentionTotal: number;
  children: ReactNode;
  description: string;
  fullName: string;
  title: string;
  workspaceName: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(attentionItems.length);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem("fate-light:sidebar") === "collapsed");
      try {
        const seen = new Set<string>(
          JSON.parse(window.localStorage.getItem("fate-light:seen-alerts") ?? "[]"),
        );
        setUnreadCount(attentionItems.filter(({ id }) => !seen.has(id)).length);
      } catch {
        setUnreadCount(attentionItems.length);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [attentionItems]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("fate-light:sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };
  const urgentCount = attentionItems.filter(({ severity }) => severity === "danger").length;
  const markNotificationsSeen = () => {
    window.localStorage.setItem(
      "fate-light:seen-alerts",
      JSON.stringify(attentionItems.map(({ id }) => id)),
    );
    setUnreadCount(0);
  };

  return (
    <main className="app-frame text-foreground min-h-screen">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:z-[90] focus:m-3 focus:rounded-lg focus:bg-white focus:p-3"
        href="#conteudo"
      >
        Pular para o conteúdo
      </a>

      {mobileOpen ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r-2 border-slate-700/15 bg-[#fdfcf7] p-4 shadow-[8px_0_32px_-25px_rgba(37,50,58,.45)] transition-[width,transform] duration-200 ${collapsed ? "lg:w-[5.5rem]" : "lg:w-[17.5rem]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex min-h-14 items-center justify-between gap-2 px-1">
          <BrandMark compact={collapsed} />
          <button
            aria-label="Fechar menu"
            className="hover:bg-brand-soft grid size-10 place-items-center rounded-xl lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          >
            <Icon name="x" />
          </button>
        </div>

        <nav aria-label="Navegação principal" className="mt-8 flex-1 space-y-2">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-12 items-center gap-4 rounded-xl border-2 px-4 font-bold ${active ? "border-brand-strong/35 bg-brand-soft text-brand-strong shadow-[2px_2px_0_rgba(22,155,136,.12)]" : "text-muted hover:border-line hover:text-foreground border-transparent hover:bg-white"}`}
                data-tour={`nav-${item.href.slice(1)}`}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-[1.35rem] shrink-0" name={item.icon} />
                {!collapsed ? <span>{item.label}</span> : null}
                {item.href === "/alertas" && attentionTotal ? (
                  <span
                    className={`${collapsed ? "absolute -mt-6 ml-5" : "ml-auto"} bg-negative grid min-w-5 place-items-center rounded-full px-1.5 text-[0.65rem] leading-5 text-white`}
                  >
                    {attentionTotal > 99 ? "99+" : attentionTotal}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-line mt-3 border-t pt-3">
          <button
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="text-muted hover:bg-brand-soft hidden min-h-11 w-full items-center gap-3 rounded-xl px-3 font-bold lg:flex"
            onClick={toggleCollapsed}
            type="button"
          >
            <Icon
              className={`size-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
              name="arrow-down"
            />
            {!collapsed ? <span>Recolher menu</span> : null}
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-[5.5rem]" : "lg:pl-[17.5rem]"}`}
      >
        <header className="border-line/90 sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b bg-[#f3f2ec]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            aria-label="Abrir menu"
            className="cartoon-card grid size-10 place-items-center lg:hidden"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>

          <form
            action="/clientes"
            className="relative hidden max-w-md flex-1 sm:block"
            method="get"
          >
            <Icon
              className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              name="search"
            />
            <input
              aria-label="Buscar clientes"
              className="h-10 w-full rounded-xl pr-4 pl-9 text-sm"
              name="q"
              placeholder="Buscar clientes..."
              type="search"
            />
          </form>
          <span className="sm:hidden" />

          {/* O painel de notificações ancora na borda direita deste grupo, e não no sino,
              para abrir sempre logo abaixo do bloco da conta. */}
          <div className="relative ml-auto flex items-center gap-2">
            <div className="contents" id="financial-privacy-control" />
            <details className="group" data-tour="notifications">
              <summary
                aria-label={`Notificações: ${unreadCount} novas, ${attentionTotal} abertas`}
                className="cartoon-card relative grid size-10 cursor-pointer place-items-center"
                onClick={markNotificationsSeen}
                role="button"
              >
                <Icon name="bell" />
                {unreadCount ? (
                  <span className="bg-negative absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border-2 border-[#f3f2ec] px-1 text-[0.62rem] leading-4 font-black text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </summary>
              <div className="panel-card absolute top-[calc(100%+0.65rem)] right-0 z-40 w-[min(22rem,calc(100vw-2rem))] p-0!">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <p className="font-black">Central de atenção</p>
                    <p className="text-muted text-xs">
                      {urgentCount
                        ? `${urgentCount} urgente${urgentCount === 1 ? "" : "s"}`
                        : "Tudo sob controle"}
                    </p>
                  </div>
                  <span className="bg-brand-soft text-brand-strong rounded-full px-2.5 py-1 text-xs font-bold">
                    {attentionTotal}
                  </span>
                </div>
                <div className="max-h-80 overflow-auto p-2">
                  {attentionItems.length ? (
                    attentionItems.slice(0, 4).map((item) => (
                      <Link
                        className="hover:bg-brand-soft flex gap-3 rounded-xl p-3"
                        href={item.href}
                        key={item.id}
                      >
                        <span
                          className={`${item.severity === "danger" ? "bg-negative-soft text-negative" : "bg-warning-soft text-warning"} grid size-9 shrink-0 place-items-center rounded-xl`}
                        >
                          <Icon className="size-4" name="alert" />
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm">{item.title}</strong>
                          <small className="text-muted mt-1 block truncate">{item.meta}</small>
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="text-muted p-6 text-center text-sm">
                      Nenhum vencimento próximo. Bom trabalho!
                    </p>
                  )}
                </div>
                <Link
                  className="text-brand-strong block border-t p-3 text-center text-sm font-black"
                  href="/alertas"
                >
                  Ver todos os alertas
                </Link>
              </div>
            </details>

            <details className="group relative">
              <summary
                aria-label="Abrir menu do perfil"
                className="hover:bg-brand-soft flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-1.5 sm:px-2"
                role="button"
              >
                <span className="bg-violet-soft text-violet border-violet/25 grid size-9 place-items-center rounded-xl border-2 text-xs font-black">
                  {getInitials(fullName)}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-black md:block">
                  {fullName}
                </span>
                <Icon className="text-muted hidden size-4 md:block" name="chevron-down" />
              </summary>
              <div className="panel-card absolute top-[calc(100%+0.65rem)] right-0 z-40 w-64 p-2!">
                <div className="border-b px-3 py-2">
                  <p className="truncate text-sm font-black">{fullName}</p>
                  <p className="text-muted truncate text-xs">{workspaceName}</p>
                </div>
                <ProfileLink href="/perfil" icon="user" label="Perfil e sistema" />
                <ProfileLink
                  href="/configuracoes/empresa"
                  icon="building"
                  label="Configurações da empresa"
                />
                <form action={signOut} className="border-t pt-1">
                  <button
                    className="text-negative hover:bg-negative-soft flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold"
                    type="submit"
                  >
                    <Icon className="size-4" name="logout" /> Sair
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        <section
          className="mx-auto w-full max-w-[92rem] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10"
          id="conteudo"
        >
          <div
            className="mb-6 flex flex-wrap items-start justify-between gap-4"
            data-animate="enter"
          >
            <div className="max-w-3xl">
              <p className="text-brand-strong flex items-center gap-2 text-xs font-black tracking-[0.13em] uppercase">
                <span className="bg-brand size-2 rounded-full" /> {workspaceName}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h1>
              <p className="text-muted mt-2 max-w-2xl text-sm leading-6 sm:text-base">
                {description}
              </p>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
          <div data-animate="enter">{children}</div>
        </section>
      </div>

      <nav
        aria-label="Navegação móvel"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border-2 border-slate-700/15 bg-white/95 p-1.5 shadow-xl backdrop-blur lg:hidden"
      >
        {navigation.slice(0, 4).map((item) => (
          <Link
            className={`${pathname.startsWith(item.href) ? "bg-brand-soft text-brand-strong" : "text-muted"} flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.63rem] font-bold`}
            href={item.href}
            key={item.href}
          >
            <Icon className="size-4" name={item.icon} /> {item.label}
          </Link>
        ))}
        <button
          className="text-muted flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.63rem] font-bold"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <Icon className="size-4" name="menu" /> Mais
        </button>
      </nav>
      <ProductTour />
    </main>
  );
}

function ProfileLink({ href, icon, label }: { href: Route; icon: IconName; label: string }) {
  return (
    <Link
      className="hover:bg-brand-soft mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold"
      href={href}
    >
      <Icon className="text-muted size-4" name={icon} /> {label}
    </Link>
  );
}
