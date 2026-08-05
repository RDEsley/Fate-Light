import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Icon, type IconName } from "@/components/ui/icon";

const highlights: { description: string; icon: IconName; title: string }[] = [
  {
    icon: "bell",
    title: "Atenção no que vence",
    description: "Cobranças, despesas e domínios aparecem antes de virarem urgência.",
  },
  {
    icon: "wallet",
    title: "Valores sem confusão",
    description: "Receita própria e verba de mídia ficam visualmente separadas.",
  },
  {
    icon: "users",
    title: "Operação no contexto",
    description: "Cada registro continua ligado ao cliente e ao seu workspace.",
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
              className="hover:bg-brand-soft min-h-11 rounded-xl px-4 py-3 text-sm font-black"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-4 py-2.5 text-sm font-black shadow-[2px_2px_0_rgba(37,50,58,.14)]"
              href="/cadastro"
            >
              Criar conta
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-8rem)] items-center gap-12 py-14 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative z-10">
            <p className="bg-warning-soft text-warning border-warning/25 inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-black">
              <Icon className="size-4" name="sparkles" /> Gestão financeira sem cara de planilha
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[.98] font-black tracking-[-0.055em] sm:text-6xl xl:text-7xl">
              Sua rotina financeira pode ser <span className="text-brand-strong">leve.</span>
            </h1>
            <p className="text-muted mt-6 max-w-2xl text-lg leading-8">
              A Fate Light reúne clientes, cobranças, despesas e vencimentos em uma experiência
              clara, visual e gostosa de usar. Clareza financeira. Caminho Certo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="bg-brand text-brand-contrast border-brand-strong flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-6 font-black shadow-[3px_3px_0_rgba(37,50,58,.14)]"
                href="/cadastro"
              >
                Começar agora <Icon className="size-4 -rotate-90" name="arrow-down" />
              </Link>
              <Link
                className="cartoon-card flex min-h-12 items-center justify-center px-6 font-black"
                href="/login"
              >
                Já tenho uma conta
              </Link>
            </div>
          </div>

          <aside className="relative mx-auto w-full max-w-xl">
            <span className="border-violet/25 absolute -top-12 -right-10 size-32 rounded-full border-2 border-dashed" />
            <div className="cartoon-card relative overflow-hidden bg-white p-5 sm:p-7">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-black">Hoje na sua operação</p>
                  <p className="text-muted text-xs">Clareza antes da correria</p>
                </div>
                <span className="bg-positive-soft text-positive rounded-full px-3 py-1 text-xs font-black">
                  Em ordem
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {highlights.map((item, index) => (
                  <article
                    className={`${index === 0 ? "sm:col-span-2" : ""} rounded-2xl border-2 border-slate-700/10 bg-[#f8f8f3] p-4`}
                    key={item.title}
                  >
                    <span
                      className={`${["bg-negative-soft text-negative", "bg-brand-soft text-brand-strong", "bg-violet-soft text-violet"][index]} grid size-10 place-items-center rounded-xl`}
                    >
                      <Icon name={item.icon} />
                    </span>
                    <h2 className="mt-4 font-black">{item.title}</h2>
                    <p className="text-muted mt-1 text-sm leading-6">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
