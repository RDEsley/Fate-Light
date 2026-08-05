"use client";

import { useState } from "react";

import { cancelCharge } from "@/app/_actions/mvp";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select-field";
import { cancellationReasons } from "@/features/mvp/schemas";

const options = cancellationReasons.map(([value, label]) => ({ label, value }));
const presetText = new Map<string, string>(
  cancellationReasons.map(([value, label]) => [value, label]),
);

/** Cancelar sempre pede motivo: meses depois, "cancelada" sozinha não explica nada. */
export function CancelChargeForm({
  chargeId,
  description,
}: {
  chargeId: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(cancellationReasons[0][0] as string);
  const [reason, setReason] = useState(presetText.get(cancellationReasons[0][0]) ?? "");

  const chooseCode = (next: string) => {
    setCode(next);
    setReason(next === "other" ? "" : (presetText.get(next) ?? ""));
  };

  const close = () => setOpen(false);

  return (
    <>
      <button className="charge-action" onClick={() => setOpen(true)} type="button">
        <Icon className="size-4" name="x" /> Cancelar
      </button>
      <Modal
        description="A cobrança deixa de ser esperada, mas continua no histórico com o motivo registrado."
        icon="x"
        onClose={close}
        open={open}
        title={`Cancelar ${description}`}
      >
        <form action={cancelCharge} className="grid gap-3" id={`cancel-${chargeId}`}>
          <input name="id" type="hidden" value={chargeId} />
          <SelectField
            label="Motivo do cancelamento"
            name="code"
            onValueChange={chooseCode}
            options={options}
            value={code}
          />
          <label className="field">
            <span className="field__label">
              {code === "other" ? "Explique o motivo" : "Detalhe (você pode ajustar)"}
            </span>
            <textarea
              maxLength={500}
              name="reason"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: cliente pediu para pausar o contrato em agosto"
              required
              value={reason}
            />
          </label>
          <div className="modal-panel__actions -mx-[1.15rem] mt-1 -mb-[0.35rem]">
            <button className="modal-cancel" onClick={close} type="button">
              Voltar
            </button>
            <button className="modal-confirm modal-confirm--danger" type="submit">
              Cancelar cobrança
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
