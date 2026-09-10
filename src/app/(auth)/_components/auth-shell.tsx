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

const highlights: { detail: string; icon: IconName; label: string }[] = [
  {
    icon: "check",
    label: "Acesso protegido",
    detail: "Sessão segura e workspace isolado.",
  },
  {
    icon: "history",
    label: "Histórico auditável",
    detail: "Movimentações com rastreio claro.",
  },
  {
    icon: "dashboard",
    label: "Operação unificada",
    detail: "Clientes, cobranças e vencimentos juntos.",
  },
];

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="auth-shell text-foreground">
      <div className="auth-shell__ambient" aria-hidden="true">
        <span className="auth-shell__orb auth-shell__orb--a" />
        <span className="auth-shell__orb auth-shell__orb--b" />
        <span className="auth-shell__orb auth-shell__orb--c" />
      </div>

      <div className="auth-shell__stage">
        <aside className="auth-shell__showcase">
          <div className="auth-shell__mesh" aria-hidden="true" />
          <div className="auth-shell__showcase-inner">
            <BrandMark />
            <div className="auth-shell__showcase-body">
              <p className="auth-shell__kicker">Fate Light</p>
              <h2 className="auth-shell__showcase-title">
                A rotina financeira com a clareza de um produto sério.
              </h2>
              <p className="auth-shell__showcase-copy">
                Feito para operar no dia a dia — com foco, rastreio e zero ruído.
              </p>
              <ul className="auth-shell__highlights" aria-label="Diferenciais">
                {highlights.map(({ detail, icon, label }) => (
                  <li className="auth-shell__highlight" key={label}>
                    <span aria-hidden="true" className="auth-shell__highlight-icon">
                      <Icon className="size-4" name={icon} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="auth-shell__credit">Desenvolvido pela Fate Eight Tech.</p>
          </div>
        </aside>

        <section className="auth-shell__workspace">
          <header className="auth-shell__workspace-top">
            <span className="lg:hidden">
              <BrandMark />
            </span>
            <Link className="auth-shell__back" href="/">
              Voltar ao início
            </Link>
          </header>

          <div className="auth-shell__workspace-main">
            <div className="auth-shell__card">
              <div className="auth-shell__card-accent" aria-hidden="true" />
              <p className="auth-shell__eyebrow">{eyebrow}</p>
              <h1 className="auth-shell__title">{title}</h1>
              {description ? <p className="auth-shell__description">{description}</p> : null}
              <div className="auth-shell__card-body">{children}</div>
            </div>
          </div>

          <footer className="auth-shell__workspace-foot">
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/privacidade">Privacidade</Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
