"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { DangerAction, DangerZone } from "@/components/ui/danger-zone";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Icon } from "@/components/ui/icon";
import { initialActionState } from "@/lib/forms/action-state";

import { resetWorkspaceOperationalData } from "./actions";

const confirmationPhrase = "EXCLUIR TUDO";

export function WorkspaceDangerZone() {
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction] = useActionState(resetWorkspaceOperationalData, initialActionState);

  const unlocked = confirmation.trim() === confirmationPhrase;

  return (
    <DangerZone
      description="Remove todos os dados operacionais deste workspace em uma única transação. Não há como desfazer."
      summary="Apagar os dados do workspace"
      title="Recomeçar do zero"
    >
      <form action={formAction} className="grid gap-3">
        {state.message ? (
          <FeedbackBanner
            message={state.message}
            tone={state.status === "error" ? "error" : "success"}
          />
        ) : null}
        <DangerAction
          description="Exclui clientes, serviços, cobranças, despesas, domínios e importações. Sua conta, a identidade da empresa e as preferências continuam ativas."
          title="Excluir todos os dados operacionais"
          action={
            <SubmitButton
              className="danger-action"
              disabled={!unlocked}
              idleLabel="Excluir todos os dados"
              pendingLabel="Excluindo…"
            />
          }
        />
        <label className="field">
          <span className="field__label">
            Digite <strong className="text-negative">{confirmationPhrase}</strong> para liberar
          </span>
          <input
            autoComplete="off"
            name="confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={confirmationPhrase}
            value={confirmation}
          />
          {confirmation && !unlocked ? (
            <span className="field__error">
              <Icon className="size-3.5" name="alert" /> A frase ainda não confere.
            </span>
          ) : null}
        </label>
      </form>
    </DangerZone>
  );
}
