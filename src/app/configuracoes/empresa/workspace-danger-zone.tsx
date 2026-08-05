"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Icon } from "@/components/ui/icon";
import { initialActionState } from "@/lib/forms/action-state";

import { resetWorkspaceOperationalData } from "./actions";

export function WorkspaceDangerZone() {
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction] = useActionState(resetWorkspaceOperationalData, initialActionState);

  return (
    <section className="danger-zone mt-5" aria-labelledby="workspace-danger-title">
      <div className="flex items-start gap-3">
        <span className="bg-negative grid size-10 shrink-0 place-items-center rounded-xl text-white">
          <Icon className="size-5" name="trash" />
        </span>
        <div>
          <h2 className="font-black" id="workspace-danger-title">
            Zona de risco
          </h2>
          <p className="text-muted mt-1 text-sm leading-5">
            Exclui clientes, serviços, cobranças, despesas, domínios e importações. Sua conta,
            empresa e preferências continuam ativas.
          </p>
        </div>
      </div>
      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        {state.message ? (
          <div className="sm:col-span-2">
            <FeedbackBanner
              message={state.message}
              tone={state.status === "error" ? "error" : "success"}
            />
          </div>
        ) : null}
        <label className="field">
          <span className="field__label">
            Para confirmar, digite <strong>EXCLUIR TUDO</strong>
          </span>
          <input
            autoComplete="off"
            name="confirmation"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        <SubmitButton
          className="danger-action self-end"
          disabled={confirmation !== "EXCLUIR TUDO"}
          idleLabel="Excluir todos os dados"
          pendingLabel="Excluindo…"
        />
      </form>
      {confirmation && confirmation !== "EXCLUIR TUDO" ? (
        <p className="text-negative mt-2 text-xs font-bold">A confirmação ainda não corresponde.</p>
      ) : null}
    </section>
  );
}
