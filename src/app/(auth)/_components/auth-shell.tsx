import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

type AuthShellProps = {
  children: ReactNode;
  /** Contexto curto acima do título; login e cadastro dispensam, o título já diz tudo. */
  eyebrow?: string;
  title: string;
  description?: string;
};

const scenePath = "M40 310C90 310 100 250 150 240C200 230 210 170 260 160C310 150 320 90 350 60";
const milestones = [
  [150, 240],
  [260, 160],
] as const;

/**
 * Cena do painel lateral: um caminho que se desenha até um ponto de luz, resolvendo dois
 * marcos no trajeto. SVG animado por CSS em vez de vídeo: não pesa no carregamento, fica
 * nítido em qualquer tela e para quando o usuário pede menos movimento.
 */
function PathScene() {
  return (
    <svg aria-hidden="true" className="auth-scene" fill="none" viewBox="0 0 400 360">
      <defs>
        <radialGradient id="auth-scene-glow">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path className="auth-scene__track" d={scenePath} />
      <path className="auth-scene__path" d={scenePath} pathLength={1} />
      <circle className="auth-scene__start" cx="40" cy="310" r="5" />
      {milestones.map(([x, y], index) => (
        <g
          className="auth-scene__milestone"
          key={x}
          style={{ animationDelay: `${0.9 + index * 0.8}s` }}
        >
          <circle cx={x} cy={y} r="11" />
          <path d={`M${x - 4.5} ${y}l3 3 6-6.5`} />
        </g>
      ))}
      <circle className="auth-scene__glow" cx="350" cy="60" fill="url(#auth-scene-glow)" r="42" />
      <circle className="auth-scene__light" cx="350" cy="60" r="9" />
    </svg>
  );
}

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="auth-shell text-foreground">
      <div className="auth-shell__ambient" aria-hidden="true">
        <span className="auth-shell__orb auth-shell__orb--a" />
        <span className="auth-shell__orb auth-shell__orb--b" />
      </div>

      <div className="auth-shell__stage">
        <aside className="auth-shell__showcase">
          <div className="auth-shell__showcase-inner">
            <BrandMark />
            <div className="auth-shell__showcase-body">
              <PathScene />
              <p className="auth-shell__showcase-title">Cada vencimento no seu lugar.</p>
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
              {eyebrow ? <p className="auth-shell__eyebrow">{eyebrow}</p> : null}
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
