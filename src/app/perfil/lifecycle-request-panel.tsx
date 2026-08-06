"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { DangerAction, DangerZone } from "@/components/ui/danger-zone";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { Icon } from "@/components/ui/icon";
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

const deletionPhrase = "EXCLUIR MINHA CONTA";

export function LifecycleRequestPanel({ requests }: { requests: LifecycleRequestSummary[] }) {
  const [exportState, exportAction] = useActionState(requestDataExport, initialActionState);
  const [deletionState, deletionAction] = useActionState(
    requestAccountDeletion,
    initialActionState,
  );
  const [confirmation, setConfirmation] = useState("");
  const unlocked = confirmation.trim() === deletionPhrase;

  return (
    <>
      <section className="panel-card">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-violet-soft text-violet">
            <Icon name="info" />
          </span>
          <div>
            <h2>Privacidade</h2>
            <p>Peça uma cópia dos seus dados e acompanhe as solicitações abertas.</p>
          </div>
        </div>

        <form action={exportAction} className="grid gap-3">
          {exportState.message ? (
            <FeedbackBanner
              message={exportState.message}
              tone={exportState.status === "error" ? "error" : "success"}
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted max-w-xl text-sm leading-5">
              <strong className="text-foreground">Exportar meus dados.</strong> Registra o pedido
              para análise. A geração do arquivo e o prazo de entrega serão habilitados em uma fase
              posterior; nenhum link é criado agora.
            </p>
            <SubmitButton idleLabel="Solicitar exportação" pendingLabel="Registrando…" />
          </div>
        </form>

        <div className="border-line mt-5 border-t pt-5">
          <h3 className="text-sm font-black">Acompanhamento</h3>
          {requests.length ? (
            <ul className="mt-3 grid gap-2">
              {requests.map((request) => (
                <li className="lifecycle-request" key={request.requestId}>
                  <span className="font-semibold">
                    {request.requestType === "export" ? "Exportação" : "Exclusão"}
                  </span>
                  <span className="text-muted text-sm">
                    Solicitada em{" "}
                    <time dateTime={request.requestedAt}>{request.requestedAtLabel}</time>
                  </span>
                  <span className="bg-brand-soft text-brand-strong rounded-full px-3 py-1 text-xs font-bold">
                    {statusLabels[request.status] ?? "Em análise"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mt-2 text-sm">Nenhuma solicitação registrada.</p>
          )}
        </div>
      </section>

      <DangerZone
        description="Nada aqui é executado automaticamente. A exclusão registra um pedido que passa por análise."
        summary="Excluir minha conta"
        title="Encerrar a conta"
      >
        <form action={deletionAction} className="grid gap-3">
          {deletionState.message ? (
            <FeedbackBanner
              message={deletionState.message}
              tone={deletionState.status === "error" ? "error" : "success"}
            />
          ) : null}
          <DangerAction
            description="Esta etapa apenas registra a solicitação. Ela não apaga dados, não suspende a conta e não inicia contagem de retenção."
            title="Solicitar exclusão da conta"
            action={
              <SubmitButton
                className="danger-action"
                disabled={!unlocked}
                idleLabel="Solicitar exclusão"
                pendingLabel="Registrando…"
              />
            }
          />
          <label className="field">
            <span className="field__label">
              Digite <strong className="text-negative">{deletionPhrase}</strong> para liberar
            </span>
            <input
              autoComplete="off"
              name="confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={deletionPhrase}
              required
              value={confirmation}
            />
            {confirmation && !unlocked ? <FieldError message="A frase ainda não confere." /> : null}
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input className="mt-1" name="acknowledged" required type="checkbox" />
            Entendo que esta etapa registra o pedido, sem executar exclusão automática.
          </label>
        </form>
      </DangerZone>
    </>
  );
}
