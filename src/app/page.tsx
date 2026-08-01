import Link from "next/link";

import { ThemeSelect } from "@/components/ui/theme-select";

const accessHighlights = [
  {
    title: "Acesso flexível",
    description: "Entre com senha ou escolha receber um magic link no seu e-mail.",
  },
  {
    title: "Dados isolados",
    description: "Cada workspace possui autorização própria aplicada no banco.",
  },
  {
    title: "Acesso verificável",
    description: "Sessão, estado da conta e destino são validados no servidor.",
  },
] as const;

export default function Home() {
  return (
    <main className="bg-canvas text-foreground min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10 lg:px-12">
        <header className="border-line flex items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-brand text-brand-contrast grid size-10 place-items-center rounded-xl font-bold shadow-sm"
            >
              8
            </span>
            <div>
              <p className="font-semibold tracking-tight">Fate Eight</p>
              <p className="text-muted text-xs">Gestão financeira com contexto</p>
            </div>
          </div>
          <ThemeSelect />
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.25fr_1fr] lg:py-24">
          <div>
            <p className="border-brand/25 bg-brand-soft text-brand-strong mb-5 inline-flex rounded-full border px-3 py-1 text-sm font-semibold">
              Gestão financeira operacional
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
              Clareza financeira começa por um acesso seguro.
            </h1>
            <p className="text-muted mt-6 max-w-2xl text-lg leading-8">
              Use e-mail e senha ou magic link para acessar um workspace isolado e organizar sua
              operação financeira.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="bg-brand text-brand-contrast min-h-11 rounded-xl px-5 py-3 text-center font-semibold"
                href="/cadastro"
              >
                Criar conta
              </Link>
              <Link
                className="border-line bg-surface hover:bg-brand-soft min-h-11 rounded-xl border px-5 py-3 text-center font-semibold transition-colors"
                href="/login"
              >
                Entrar
              </Link>
            </div>
          </div>

          <aside
            aria-label="Proteções do acesso"
            className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8"
          >
            <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
              Segurança por padrão
            </p>
            <ul className="mt-6 space-y-6">
              {accessHighlights.map((item, index) => (
                <li className="grid grid-cols-[2rem_1fr] gap-3" key={item.title}>
                  <span
                    aria-hidden="true"
                    className="bg-brand-soft text-brand-strong grid size-8 place-items-center rounded-lg text-sm font-bold"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="text-muted mt-1 text-sm leading-6">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <footer className="border-line text-muted flex flex-col gap-2 border-t py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>Desenvolvido pela Fate Eight Tech</p>
          <p>Autenticação segura, workspace isolado.</p>
        </footer>
      </div>
    </main>
  );
}
