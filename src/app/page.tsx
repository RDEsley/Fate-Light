import { ThemeSelect } from "@/components/ui/theme-select";

const foundationItems = [
  {
    title: "Base web",
    description: "Next.js com App Router, Server Components por padrão e TypeScript estrito.",
  },
  {
    title: "Dados preparados",
    description: "Clientes Supabase separados por ambiente, sem tabelas ou regras de negócio.",
  },
  {
    title: "Qualidade contínua",
    description: "Lint, testes, cobertura, acessibilidade e build reproduzível desde o início.",
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
              <p className="font-semibold tracking-tight">Fate Eight Finance</p>
              <p className="text-muted text-xs">Fundação técnica</p>
            </div>
          </div>
          <ThemeSelect />
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.35fr_1fr] lg:py-24">
          <div>
            <p className="border-brand/25 bg-brand-soft text-brand-strong mb-5 inline-flex rounded-full border px-3 py-1 text-sm font-semibold">
              Fase 2 em execução
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-6xl">
              Uma base segura para o financeiro crescer sem atalhos.
            </h1>
            <p className="text-muted mt-6 max-w-2xl text-lg leading-8">
              Esta entrega estabelece aplicação, ambiente, integração técnica e gates de qualidade.
              Login, cadastro, perfil e regras financeiras entram somente nas próximas fases
              aprovadas.
            </p>
          </div>

          <aside
            aria-label="Escopo desta fundação"
            className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8"
          >
            <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
              Escopo controlado
            </p>
            <ul className="mt-6 space-y-6">
              {foundationItems.map((item, index) => (
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
          <p>Fate Eight Tech</p>
          <p>Infraestrutura antes do domínio.</p>
        </footer>
      </div>
    </main>
  );
}
