"use client";

import { useState } from "react";

import { markExpensePaid } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { PaymentDateField } from "@/app/cobrancas/payment-date-field";
import { Form } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

/**
 * Baixa de despesa em um diálogo curto, igual ao de receber cobrança: confirma o valor,
 * avisa quando a série mensal vai agendar a próxima e pergunta o dia do pagamento.
 */
export function SettleExpenseButton({
  amountLabel,
  description,
  expenseId,
  monthly,
  returnTo,
}: {
  amountLabel: string;
  description: string;
  expenseId: string;
  /** Série mensal ativa: pagar já cria a próxima ocorrência. */
  monthly: boolean;
  returnTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        aria-label={`Pagar ${description}`}
        className="button button--primary button--small"
        onClick={() => setOpen(true)}
        type="button"
      >
        Pagar
      </button>
      <Modal
        description={
          monthly
            ? `${amountLabel} · ao pagar, a próxima ocorrência mensal é criada automaticamente.`
            : `${amountLabel} · confirme quando o pagamento saiu.`
        }
        icon="wallet"
        onClose={close}
        open={open}
        title={`Pagar ${description}`}
      >
        <Form action={markExpensePaid} className="grid gap-4">
          <input name="id" type="hidden" value={expenseId} />
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <PaymentDateField />
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
