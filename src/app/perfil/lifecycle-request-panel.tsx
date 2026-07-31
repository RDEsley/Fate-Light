"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { initialActionState } from "@/lib/forms/action-state";

import { requestAccountDeletion, requestDataExport } from "./lifecycle-actions";

export type LifecycleRequestSummary = {
  requestId: string;
  requestedAt: string;
  requestedAtLabel: string;
  requestType: "export" | "deletion";
  status: string;
};

const statusLabels: Record<string, string> = {
  cancelled: "Cancelada",
  completed: "Concluída",
  failed: "Falhou",
  processing: "Em processamento",
  requested: "Solicitada",
  scheduled: "Agendada",
  verified: "Verificada",
};

function ActionMessage({ message }: { message?: string }) {
  return message ? (
    <p
      className="border-line bg-brand-soft text-brand-strong rounded-xl border px-4 py-3 text-sm"
      role="status"
    >
      {message}
    </p>
  ) : null;
}

export function LifecycleRequestPanel({ requests }: { requests: LifecycleRequestSummary[] }) {
  const [exportState, exportAction] = useActionState(requestDataExport, initialActionState);
  const [deletionState, deletionAction] = useActionState(
    requestAccountDeletion,
    initialActionState,
  );

  return (
    <div className="space-y-6">
      <section className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Seus dados</h2>
        <p className="text-muted mt-2 text-sm leading-6">
          Registre um pedido de exportação. A geração do arquivo e o prazo de entrega serão
          habilitados em uma fase posterior; nenhum link ou arquivo é criado agora.
        </p>
        <form action={exportAction} className="mt-5 space-y-4">
          <ActionMessage message={exportState.message} />
          <SubmitButton idleLabel="Solicitar exportação" pendingLabel="Registrando…" />
        </form>
      </section>

      <section className="border-line bg-surface rounded-2xl border p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Zona de risco</h2>
        <p className="text-muted mt-2 text-sm leading-6" id="deletion-explanation">
          Esta ação apenas registra a solicitação para análise. Ela não apaga dados, não suspende a
          conta e não inicia contagem de retenção. A execução e os prazos dependem da política que
          será aprovada na fase de ciclo de conta.
        </p>
        <form action={deletionAction} className="mt-5 space-y-4">
          <ActionMessage message={deletionState.message} />
          <label className="block text-sm font-semibold">
            Digite EXCLUIR MINHA CONTA
            <input
              aria-describedby="deletion-explanation"
              autoComplete="off"
              className="border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base"
              name="confirmation"
              required
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input className="mt-1" name="acknowledged" required type="checkbox" />
            Entendo que esta etapa registra o pedido, sem executar exclusão automática.
          </label>
          <SubmitButton idleLabel="Solicitar exclusão" pendingLabel="Registrando…" />
        </form>
      </section>

      <section className="border-line bg-surface rounded-2xl border p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Acompanhamento</h2>
        {requests.length ? (
          <ul className="mt-4 space-y-3">
            {requests.map((request) => (
              <li className="border-line rounded-xl border p-4" key={request.requestId}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {request.requestType === "export" ? "Exportação" : "Exclusão"}
                  </span>
                  <span className="bg-brand-soft text-brand-strong rounded-full px-3 py-1 text-xs font-semibold">
                    {statusLabels[request.status] ?? "Em análise"}
                  </span>
                </div>
                <p className="text-muted mt-2 text-sm">
                  Solicitada em{" "}
                  <time dateTime={request.requestedAt}>{request.requestedAtLabel}</time>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mt-3 text-sm">Nenhuma solicitação registrada.</p>
        )}
      </section>
    </div>
  );
}
