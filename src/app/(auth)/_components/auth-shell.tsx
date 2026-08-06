import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="text-foreground min-h-screen p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-[1.4rem] border-2 border-slate-700/15 bg-white shadow-[5px_5px_0_rgba(37,50,58,.10)] lg:grid-cols-[minmax(22rem,.85fr)_minmax(30rem,1.15fr)]">
        <aside className="relative hidden overflow-hidden border-r-2 border-slate-700/15 bg-[#e5f7f1] p-10 lg:flex lg:flex-col">
          <span className="border-brand/30 absolute -top-16 -left-16 size-48 rounded-full border-2 border-dashed" />
          <span className="bg-warning-soft absolute right-12 bottom-20 size-20 rotate-12 rounded-[35%_65%_45%_55%]" />
          <BrandMark />
          <div className="relative my-auto max-w-lg py-16">
            <span className="bg-warning-soft text-warning border-warning/30 grid size-12 place-items-center rounded-2xl border-2 shadow-[3px_3px_0_rgba(37,50,58,.10)]">
              <Icon name="sparkles" />
            </span>
            <h2 className="mt-6 text-4xl leading-[1.08] font-black tracking-[-0.045em]">
              Dinheiro organizado. Cabeça tranquila.
            </h2>
            <p className="text-muted mt-5 max-w-md text-base leading-7">
              Uma rotina financeira leve, visual e direta — feita para você enxergar o próximo passo
              sem navegar por planilhas.
            </p>
            <div
              aria-label="Benefícios do acesso"
              className="mt-8 grid grid-cols-3 gap-3"
              role="list"
            >
              {["Seguro", "Rápido", "Organizado"].map((label, index) => (
                <span
                  className="cartoon-card bg-white p-3 text-center text-xs font-black"
                  key={label}
                  role="listitem"
                >
                  <span aria-hidden="true" className="text-brand-strong mb-1 block text-lg">
                    {["●", "▲", "◆"][index]}
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <p className="text-muted text-xs">Desenvolvido pela Fate Light Tech.</p>
        </aside>

        <section className="flex min-w-0 flex-col overflow-y-auto p-5 sm:p-8 lg:p-10">
          <header className="flex items-center justify-between lg:justify-end">
            <span className="lg:hidden">
              <BrandMark />
            </span>
            <Link className="text-muted hover:text-brand-strong text-sm font-bold" href="/">
              Voltar ao início
            </Link>
          </header>
          <div className="mx-auto my-auto w-full max-w-md py-6">
            <p className="text-brand-strong text-xs font-black tracking-[0.14em] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-black tracking-[-0.04em] sm:text-3xl">
              {title}
            </h1>
            <p className="text-muted mt-2 text-sm leading-6">{description}</p>
            <div className="mt-5">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
