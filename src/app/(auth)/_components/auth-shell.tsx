import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Icon, type IconName } from "@/components/ui/icon";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
};

const benefits: { icon: IconName; label: string }[] = [
  { icon: "check", label: "Seguro" },
  { icon: "history", label: "Histórico" },
  { icon: "dashboard", label: "Clareza" },
];

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="auth-shell text-foreground h-dvh overflow-hidden p-3 sm:p-4">
      <div className="auth-shell__frame mx-auto grid h-full w-full max-w-6xl overflow-hidden lg:grid-cols-[minmax(18rem,0.9fr)_minmax(26rem,1.1fr)]">
        <aside className="auth-shell__aside relative hidden overflow-hidden p-8 lg:flex lg:flex-col xl:p-10">
          <span aria-hidden="true" className="auth-shell__glow auth-shell__glow--one" />
          <span aria-hidden="true" className="auth-shell__glow auth-shell__glow--two" />
          <BrandMark />
          <div className="relative my-auto max-w-md py-8">
            <p className="auth-shell__kicker">Fate Light</p>
            <h2 className="mt-3 text-[1.85rem] leading-[1.12] font-semibold tracking-[-0.04em] xl:text-[2.1rem]">
              Clareza financeira para quem opera de verdade.
            </h2>
            <ul className="auth-shell__benefits mt-8" aria-label="Benefícios do acesso">
              {benefits.map(({ icon, label }) => (
                <li className="auth-shell__benefit" key={label}>
                  <span aria-hidden="true" className="auth-shell__benefit-icon">
                    <Icon className="size-4" name={icon} />
                  </span>
                  <span className="text-xs font-semibold tracking-[-0.01em]">{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-muted relative text-xs">Desenvolvido pela Fate Eight Tech.</p>
        </aside>

        <section className="auth-shell__content relative flex min-w-0 flex-col overflow-y-auto bg-[var(--surface-raised)] p-4 sm:p-6 lg:overflow-hidden lg:p-8">
          <span aria-hidden="true" className="auth-shell__glow auth-shell__glow--form" />
          <header className="relative flex shrink-0 items-center justify-between lg:justify-end">
            <span className="lg:hidden">
              <BrandMark />
            </span>
            <Link className="text-muted hover:text-brand-strong text-sm font-medium" href="/">
              Voltar ao início
            </Link>
          </header>
          <div className="auth-shell__form relative mx-auto my-auto w-full max-w-[24rem] py-3">
            <p className="auth-shell__eyebrow">{eyebrow}</p>
            <h1 className="mt-1.5 text-[1.5rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[1.7rem]">
              {title}
            </h1>
            {description ? <p className="text-muted mt-1.5 text-sm leading-6">{description}</p> : null}
            <div className="auth-shell__panel mt-4">{children}</div>
          </div>
          <footer className="text-muted relative flex shrink-0 justify-center gap-4 pt-2 text-xs">
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
