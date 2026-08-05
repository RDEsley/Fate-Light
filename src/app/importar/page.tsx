import { AccountShell } from "@/app/_components/account-shell";
import { Icon } from "@/components/ui/icon";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { ImportWorkbook } from "./import-workbook";

export const runtime = "nodejs";
export const maxDuration = 30;

export default async function ImportPage() {
  const { supabase, workspaceId } = await requireWorkspaceContext();
  const { data: jobs } = await supabase
    .from("import_jobs")
    .select("id,row_count,entity_counts,confirmed_at")
    .eq("workspace_id", workspaceId)
    .order("confirmed_at", { ascending: false })
    .limit(5);

  return (
    <AccountShell
      description="Traga clientes e movimentos para o sistema com validação antes de gravar."
      title="Importar dados"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="panel-card">
          <div className="section-heading mb-6">
            <span className="section-heading__icon bg-brand-soft text-brand-strong">
              <Icon name="upload" />
            </span>
            <div>
              <h2>Planilha para Fate Light</h2>
              <p>O arquivo não é armazenado. A confirmação grava todo o lote ou não grava nada.</p>
            </div>
          </div>
          <ImportWorkbook />
        </section>

        <aside className="space-y-5">
          <section className="panel-card">
            <h2 className="font-black">Como preparar</h2>
            <ol className="text-muted mt-4 space-y-3 text-sm leading-6">
              <li>
                <strong className="text-foreground">1.</strong> Baixe o modelo e use uma linha para
                cada entidade.
              </li>
              <li>
                <strong className="text-foreground">2.</strong> Mantenha o nome do cliente igual nos
                vínculos.
              </li>
              <li>
                <strong className="text-foreground">3.</strong> Gere a prévia e corrija todos os
                erros.
              </li>
              <li>
                <strong className="text-foreground">4.</strong> Confirme somente depois de revisar
                as contagens.
              </li>
            </ol>
          </section>
          <section className="panel-card">
            <h2 className="font-black">Últimos lotes</h2>
            <div className="mt-4 space-y-3">
              {jobs?.length ? (
                jobs.map((job) => (
                  <article className="border-line rounded-xl border p-3" key={job.id}>
                    <p className="font-bold">{job.row_count} registros</p>
                    <p className="text-muted mt-1 text-xs">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(job.confirmed_at))}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-muted text-sm">Nenhuma importação confirmada ainda.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </AccountShell>
  );
}
