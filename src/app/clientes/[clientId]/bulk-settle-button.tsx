"use client";

import { useState } from "react";

import { settleChargesInBulk } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { PaymentDateField } from "@/app/cobrancas/payment-date-field";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Form } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";

const paymentOptions = ["Pix", "Boleto", "Cartão", "Transferência", "Dinheiro", "Outro"].map(
  (method) => ({ label: method, value: method }),
);

export type BulkSettleCharge = {
  amount: number;
  description: string;
  dueDate: string;
  id: string;
};

/**
 * Recebe de uma vez as cobranças vencidas do cliente — o caso de quem paga vários meses
 * atrasados juntos. O diálogo lista exatamente o que será baixado, e só esses ids vão para
 * o servidor: nada além do que o usuário viu é quitado.
 */
export function BulkSettleButton({
  charges,
  clientId,
}: {
  charges: BulkSettleCharge[];
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);

  return (
    <>
      <button
        className="button button--secondary button--small"
        onClick={() => setOpen(true)}
        type="button"
      >
        Receber vencidas ({charges.length})
      </button>
      <Modal
        description={`${charges.length} cobranças · ${formatCurrency(total)}. Todas com a mesma forma e data de pagamento.`}
        icon="wallet"
        onClose={close}
        open={open}
        title="Receber cobranças vencidas"
      >
        <Form action={settleChargesInBulk} className="grid gap-4">
          <input name="clientId" type="hidden" value={clientId} />
          {charges.map((charge) => (
            <input key={charge.id} name="chargeId" type="hidden" value={charge.id} />
          ))}
          <ul aria-label="Cobranças que serão recebidas" className="bulk-settle-list">
            {charges.map((charge) => (
              <li key={charge.id}>
                <span>
                  <strong>{charge.description}</strong>
                  <small>Venceu em {formatDatePtBr(charge.dueDate)}</small>
                </span>
                <span>{formatCurrency(charge.amount)}</span>
              </li>
            ))}
          </ul>
          <ChoiceChips
            defaultValue="Pix"
            label="Forma de pagamento"
            name="paymentMethod"
            options={paymentOptions}
          />
          <PaymentDateField />
          <div className="modal-panel__actions -mx-[1.15rem] mt-1 -mb-[0.35rem]">
            <button className="modal-cancel" onClick={close} type="button">
              Voltar
            </button>
            <SubmitButton
              idleLabel={`Receber ${charges.length} cobranças`}
              pendingLabel="Registrando…"
            />
          </div>
        </Form>
      </Modal>
    </>
  );
}
