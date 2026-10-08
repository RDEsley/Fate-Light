"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { accountDeletionPhrase } from "@/features/account/lifecycle";
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

/**
 * Privacidade da conta em duas ações diretas. A exclusão não mora mais atrás de um bloco
 * com campo e caixa de ciência: o botão abre a confirmação, e é nela que a frase é pedida.
 */
export function LifecycleRequestPanel({ requests }: { requests: LifecycleRequestSummary[] }) {
  const [exportState, exportAction] = useActionState(requestDataExport, initialActionState);
  const [deletionState, deletionAction] = useActionState(
    requestAccountDeletion,
    initialActionState,
  );

  return (
    <section className="panel-card">
      <div className="section-heading mb-2">
        <span className="section-heading__icon bg-violet-soft text-violet">
          <Icon name="info" />
        </span>
        <div>
          <h2>Privacidade</h2>
          <p>Peça uma cópia dos seus dados ou o encerramento da conta.</p>
        </div>
      </div>

      <div className="action-list">
        <Form action={exportAction} className="action-row" state={exportState}>
          <div className="action-row__head">
            <span className="action-row__icon">
              <Icon className="size-4" name="download" />
            </span>
            <span className="action-row__text">
              <strong>Exportar meus dados</strong>
              <small>
                Registra o pedido para análise. A geração do arquivo será habilitada em uma fase
                posterior; nenhum link é criado agora.
              </small>
            </span>
            <SubmitButton
              className="button--small"
              idleLabel="Solicitar exportação"
              pendingLabel="Registrando…"
            />
          </div>
        </Form>

        <Form action={deletionAction} className="action-row" state={deletionState}>
          <div className="action-row__head">
            <span className="action-row__icon" data-tone="danger">
              <Icon className="size-4" name="trash" />
            </span>
            <span className="action-row__text">
              <strong>Excluir minha conta</strong>
              <small>
                Registra o pedido de exclusão da conta e de todos os seus dados. O pedido passa por
                análise antes de qualquer coisa ser apagada.
              </small>
            </span>
            <ConfirmDialog
              className="button button--danger-outline button--small"
              confirmLabel="Solicitar exclusão"
              confirmation="O pedido de exclusão da sua conta e de todos os seus dados será registrado para análise. Nada é apagado nem suspenso agora."
              icon="trash"
              label="Excluir conta"
              phraseFieldName="confirmation"
              requiredPhrase={accountDeletionPhrase}
              title="Excluir minha conta"
            />
          </div>
        </Form>
      </div>

      <div className="border-line mt-2 border-t pt-4">
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
  );
}
