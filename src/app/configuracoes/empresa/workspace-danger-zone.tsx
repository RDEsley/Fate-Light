"use client";

import { useActionState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { workspaceResetPhrase } from "@/features/account/lifecycle";
import { initialActionState } from "@/lib/forms/action-state";

import { resetWorkspaceOperationalData } from "./actions";

/**
 * Recomeçar o workspace do zero. Uma linha discreta na página; a frase de confirmação e
 * o tempo de leitura ficam no diálogo, que só aparece para quem de fato clicou em excluir.
 */
export function WorkspaceDangerZone() {
  const [state, formAction] = useActionState(resetWorkspaceOperationalData, initialActionState);

  return (
    <section className="panel-card">
      <div className="section-heading mb-2">
        <span className="section-heading__icon bg-negative-soft text-negative">
          <Icon name="alert" />
        </span>
        <div>
          <h2>Zona de risco</h2>
          <p>Ações que não podem ser desfeitas.</p>
        </div>
      </div>
      <Form action={formAction} className="action-row" state={state}>
        <div className="action-row__head">
          <span className="action-row__icon" data-tone="danger">
            <Icon className="size-4" name="trash" />
          </span>
          <span className="action-row__text">
            <strong>Excluir todos os dados operacionais</strong>
            <small>
              Apaga clientes, serviços, cobranças, despesas, domínios e importações. Sua conta, a
              identidade da empresa e as preferências continuam.
            </small>
          </span>
          <ConfirmDialog
            className="button button--danger-outline button--small"
            confirmLabel="Excluir todos os dados"
            confirmation="Clientes, serviços, cobranças, despesas, domínios e importações deste workspace são apagados em uma única operação. Não há como desfazer."
            holdSeconds={3}
            icon="trash"
            label="Excluir dados"
            phraseFieldName="confirmation"
            requiredPhrase={workspaceResetPhrase}
            title="Recomeçar do zero"
          />
        </div>
      </Form>
    </section>
  );
}
