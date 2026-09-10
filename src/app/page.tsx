import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { LandingHeroTitle } from "@/components/landing-hero-title";
import { LandingWaterCursor } from "@/components/landing-water-cursor";
import { Icon, type IconName } from "@/components/ui/icon";

const highlights: { description: string; icon: IconName; title: string }[] = [
  {
    icon: "bell",
    title: "Vencimentos",
    description: "Alertas antes da urgência.",
  },
  {
    icon: "wallet",
    title: "Receitas claras",
    description: "Própria e mídia separadas.",
  },
  {
    icon: "users",
    title: "Por cliente",
    description: "Contexto sem misturar contas.",
  },
];

export default function Home() {
  return (
    <main className="landing-page text-foreground relative h-dvh overflow-hidden">
      <LandingWaterCursor />
      <span aria-hidden="true" className="landing-bg landing-bg--one" />
      <span aria-hidden="true" className="landing-bg landing-bg--two" />
      <span aria-hidden="true" className="landing-bg landing-bg--three" />

      <div className="relative z-[2] mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-7 lg:px-10">
        <header className="flex shrink-0 items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link
              className="text-foreground hover:bg-brand-soft min-h-10 rounded-xl px-4 py-2.5 text-sm font-semibold"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="landing-cta landing-cta--primary min-h-10 px-4 py-2 text-sm"
              href="/cadastro"
            >
              Criar conta
            </Link>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 items-center gap-8 py-4 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          <div className="relative z-10">
            <span aria-hidden="true" className="landing-feather landing-feather--one" />
            <span aria-hidden="true" className="landing-feather landing-feather--two" />
            <LandingHeroTitle />
            <p className="text-muted mt-4 max-w-lg text-base leading-7 sm:text-lg sm:leading-8">
              Clientes, cobranças e vencimentos em um workspace claro. Clareza financeira. Caminho
              certo.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                className="landing-cta landing-cta--primary flex min-h-11 items-center justify-center gap-2 px-6"
                href="/cadastro"
              >
                Começar agora <Icon className="size-4 -rotate-90" name="arrow-down" />
              </Link>
              <Link
                className="landing-cta landing-cta--secondary flex min-h-11 items-center justify-center px-6"
                href="/login"
              >
                Já tenho uma conta
              </Link>
            </div>
          </div>

          <aside className="landing-preview relative mx-auto w-full max-w-xl">
            <div className="landing-preview__panel">
              <div className="landing-preview__header">
                <div>
                  <p className="text-[0.95rem] font-semibold tracking-[-0.02em]">
                    Resumo operacional
                  </p>
                  <p className="text-muted mt-0.5 text-xs">O essencial do dia</p>
                </div>
                <span className="landing-preview__status">Em ordem</span>
              </div>
              <div className="landing-preview__grid">
                {highlights.map((item, index) => (
                  <article className="landing-preview__card" key={item.title}>
                    <span className={`landing-preview__icon landing-preview__icon--${index}`}>
                      <Icon name={item.icon} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold tracking-[-0.015em]">{item.title}</h2>
                      <p className="text-muted mt-0.5 text-xs leading-5">{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <footer className="text-muted flex shrink-0 flex-wrap justify-center gap-4 border-t py-3 text-xs">
          <span>© 2026 Fate Eight Tech</span>
          <Link className="hover:text-brand-strong hover:underline" href="/termos">
            Termos de Uso
          </Link>
          <Link className="hover:text-brand-strong hover:underline" href="/privacidade">
            Política de Privacidade
          </Link>
        </footer>
      </div>
    </main>
  );
}
