import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { LandingHeroTitle } from "@/components/landing-hero-title";
import { Icon, type IconName } from "@/components/ui/icon";

const highlights: { description: string; icon: IconName; title: string }[] = [
  {
    icon: "bell",
    title: "Vencimentos sob controle",
    description: "Cobranças, despesas e domínios aparecem com antecedência, antes da urgência.",
  },
  {
    icon: "wallet",
    title: "Receitas separadas",
    description: "Receita própria e verba de mídia permanecem distintas na operação e nos totais.",
  },
  {
    icon: "users",
    title: "Contexto por cliente",
    description: "Cada lançamento fica ligado ao cliente e ao workspace, sem misturar contas.",
  },
];

export default function Home() {
  return (
    <main className="text-foreground min-h-screen overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link
              className="text-foreground hover:bg-brand-soft min-h-11 rounded-xl px-4 py-3 text-sm font-semibold"
              href="/login"
            >
              Entrar
            </Link>
            <Link className="landing-cta landing-cta--primary min-h-11 px-4 py-2.5 text-sm" href="/cadastro">
              Criar conta
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-8rem)] items-center gap-12 py-14 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative z-10">
            <span aria-hidden="true" className="landing-feather landing-feather--one" />
            <span aria-hidden="true" className="landing-feather landing-feather--two" />
            <LandingHeroTitle />
            <p className="text-muted mt-6 max-w-xl text-lg leading-8">
              Clientes, cobranças, despesas e vencimentos em um workspace claro — para operar com
              confiança no dia a dia. Clareza financeira. Caminho certo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="landing-cta landing-cta--primary flex min-h-12 items-center justify-center gap-2 px-6"
                href="/cadastro"
              >
                Começar agora <Icon className="size-4 -rotate-90" name="arrow-down" />
              </Link>
              <Link
                className="landing-cta landing-cta--secondary flex min-h-12 items-center justify-center px-6"
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
                  <p className="text-[0.95rem] font-semibold tracking-[-0.02em]">Resumo operacional</p>
                  <p className="text-muted mt-0.5 text-xs">Visão do que merece atenção hoje</p>
                </div>
                <span className="landing-preview__status">Em ordem</span>
              </div>
              <div className="landing-preview__grid">
                {highlights.map((item, index) => (
                  <article
                    className={`landing-preview__card${index === 0 ? " landing-preview__card--wide" : ""}`}
                    key={item.title}
                  >
                    <span className={`landing-preview__icon landing-preview__icon--${index}`}>
                      <Icon name={item.icon} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-[0.95rem] font-semibold tracking-[-0.015em]">{item.title}</h2>
                      <p className="text-muted mt-1 text-sm leading-6">{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </section>
        <footer className="text-muted flex flex-wrap justify-center gap-4 border-t py-5 text-xs">
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
