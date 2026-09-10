import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Icon, type IconName } from "@/components/ui/icon";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

const benefits: { icon: IconName; label: string; detail: string }[] = [
  {
    icon: "check",
    label: "Acesso protegido",
    detail: "Sessão autenticada e isolamento por workspace.",
  },
  {
    icon: "history",
    label: "Histórico confiável",
    detail: "Movimentações rastreáveis para revisão e auditoria.",
  },
  {
    icon: "dashboard",
    label: "Operação clara",
    detail: "Clientes, cobranças e vencimentos no mesmo lugar.",
  },
];

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="auth-shell text-foreground min-h-screen p-3 sm:p-6">
      <div className="auth-shell__frame mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-6xl overflow-hidden lg:grid-cols-[minmax(20rem,0.92fr)_minmax(28rem,1.08fr)] sm:min-h-[calc(100vh-3rem)]">
        <aside className="auth-shell__aside relative hidden overflow-hidden p-10 lg:flex lg:flex-col">
          <BrandMark />
          <div className="relative my-auto max-w-md py-14">
            <p className="auth-shell__kicker">Fate Light</p>
            <h2 className="mt-3 text-[2rem] leading-[1.12] font-semibold tracking-[-0.04em] xl:text-[2.25rem]">
              Clareza financeira para quem opera de verdade.
            </h2>
            <p className="text-muted mt-4 max-w-sm text-[0.95rem] leading-7">
              Organize clientes, cobranças e vencimentos com uma interface limpa — feita para
              rotina profissional, sem ruído visual.
            </p>
            <ul className="auth-shell__benefits mt-9" aria-label="Benefícios do acesso">
              {benefits.map(({ icon, label, detail }) => (
                <li className="auth-shell__benefit" key={label}>
                  <span aria-hidden="true" className="auth-shell__benefit-icon">
                    <Icon className="size-4" name={icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold tracking-[-0.01em]">{label}</span>
                    <span className="text-muted mt-0.5 block text-xs leading-5">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted text-xs">Desenvolvido pela Fate Eight Tech.</p>
        </aside>

        <section className="auth-shell__content flex min-w-0 flex-col overflow-y-auto bg-[var(--surface-raised)] p-5 sm:p-8 lg:p-11">
          <header className="flex items-center justify-between lg:justify-end">
            <span className="lg:hidden">
              <BrandMark />
            </span>
            <Link className="text-muted hover:text-brand-strong text-sm font-medium" href="/">
              Voltar ao início
            </Link>
          </header>
          <div className="auth-shell__form mx-auto my-auto w-full max-w-[24rem] py-6 sm:py-8">
            <p className="auth-shell__eyebrow">{eyebrow}</p>
            <h1 className="mt-2 text-[1.65rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[1.85rem]">
              {title}
            </h1>
            <p className="text-muted mt-2 text-sm leading-6">{description}</p>
            <div className="auth-shell__panel mt-6">{children}</div>
          </div>
          <footer className="text-muted flex justify-center gap-4 text-xs">
            <Link className="hover:text-brand-strong hover:underline" href="/termos">
              Termos de Uso
            </Link>
            <Link className="hover:text-brand-strong hover:underline" href="/privacidade">
              Privacidade
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
