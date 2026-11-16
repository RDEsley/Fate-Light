"use client";

import { useState } from "react";

import { markChargePaid } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FileField } from "@/components/ui/file-field";
import { Form } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { maxFiscalDocumentBytes } from "@/features/documents/fiscal-document";

import { PaymentDateField } from "./payment-date-field";

const paymentMethods = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"];
const paymentOptions = paymentMethods.map((method) => ({ label: method, value: method }));

/**
 * Baixa de uma cobrança a partir da linha da lista. A forma de pagamento é confirmada em
 * um diálogo curto: a linha fica compacta e nenhum pagamento é registrado com um palpite
 * que o usuário não viu. O comprovante é opcional e segue junto com a baixa.
 */
export function SettleChargeButton({
  amountLabel,
  chargeId,
  description,
  returnTo,
}: {
  amountLabel: string;
  chargeId: string;
  description: string;
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        aria-label={`Receber ${description}`}
        className="button button--primary button--small"
        onClick={() => setOpen(true)}
        type="button"
      >
        Receber
      </button>
      <Modal
        description={`${amountLabel} · confirme como o pagamento chegou.`}
        icon="wallet"
        onClose={close}
        open={open}
        title={`Receber ${description}`}
      >
        <Form action={markChargePaid} className="grid gap-4">
          <input name="id" type="hidden" value={chargeId} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <ChoiceChips
            defaultValue="Pix"
            label="Forma de pagamento"
            name="paymentMethod"
            options={paymentOptions}
          />
          <PaymentDateField />
          <FileField
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            help="PDF ou imagem de até 4 MB · acesso privado"
            label="Comprovante de pagamento"
            maxBytes={maxFiscalDocumentBytes}
            name="proof"
            optional
            tooLargeMessage="O comprovante ultrapassa o limite de 4 MB."
          />
          <div className="modal-panel__actions -mx-[1.15rem] mt-1 -mb-[0.35rem]">
            <button className="modal-cancel" onClick={close} type="button">
              Voltar
            </button>
            <SubmitButton idleLabel="Marcar como paga" pendingLabel="Registrando…" />
          </div>
        </Form>
      </Modal>
    </>
  );
}
