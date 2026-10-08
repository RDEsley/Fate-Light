"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/ui/form";
import { ClientCombobox, type ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { useErrorToast } from "@/components/ui/use-error-toast";
import { transferPhrase } from "@/features/clients/entity-schemas";
import { formatCurrency } from "@/features/mvp/format";

import { previewTransferClientData, transferClientData } from "./transfer-actions";
import { initialTransferState } from "./transfer-state";

/**
 * Transferência dos dados deste cliente para outro cadastro. Caminho sempre
 * prévia → confirmação por frase: mover operação financeira não pode ser um clique só.
 */
export function TransferClientPanel({
  clients,
  sourceClientId,
  sourceClientName,
}: {
  clients: ClientOption[];
  sourceClientId: string;
  sourceClientName: string;
}) {
  const [previewState, previewAction] = useActionState(
    previewTransferClientData,
    initialTransferState,
  );
  const [confirmState, confirmAction] = useActionState(transferClientData, initialTransferState);
  useErrorToast(previewState);
  useErrorToast(confirmState);

  const preview = previewState.status === "preview" ? previewState.preview : undefined;

  if (!clients.length) {
    return (
      <p className="helper-note">
        <Icon className="size-4" name="info" /> Não há outro cliente disponível para receber os
        dados deste.
      </p>
    );
  }

  return (
    <>
      <Form action={previewAction} className="inline-form">
        <input name="sourceClientId" type="hidden" value={sourceClientId} />
        <ClientCombobox
          clients={clients}
          defaultFilter="all"
          hint={`Tudo de ${sourceClientName} passa para o cliente escolhido. Nenhum valor é recalculado e o histórico de eventos permanece na origem.`}
          label="Cliente de destino"
          name="targetClientId"
        />
        <SubmitButton idleLabel="Ver prévia" pendingLabel="Calculando…" />
      </Form>

      {preview ? (
        <form action={confirmAction} className="grid gap-3">
          <input name="confirmation" type="hidden" value={transferPhrase} />
          <input name="sourceClientId" type="hidden" value={sourceClientId} />
          <input name="targetClientId" type="hidden" value={preview.target.id} />
          <section className="consolidation-preview" aria-live="polite">
            <p>
              Tudo de <strong>{preview.source.name}</strong> passa para{" "}
              <strong>{preview.target.name}</strong>.
            </p>
            <dl>
              <div>
                <dt>Empresas/marcas</dt>
                <dd>{preview.counts.entities}</dd>
              </div>
              <div>
                <dt>Serviços</dt>
                <dd>{preview.counts.services}</dd>
              </div>
              <div>
                <dt>Cobranças</dt>
                <dd>{preview.counts.charges}</dd>
              </div>
              <div>
                <dt>Despesas</dt>
                <dd>{preview.counts.expenses}</dd>
              </div>
              <div>
                <dt>Domínios</dt>
                <dd>{preview.counts.domains}</dd>
              </div>
              <div>
                <dt>Contatos</dt>
                <dd>{preview.counts.contacts}</dd>
              </div>
              <div>
                <dt>Receita própria recebida</dt>
                <dd>{formatCurrency(preview.totals.own_received)}</dd>
              </div>
              <div>
                <dt>Verba e repasses</dt>
                <dd>{formatCurrency(preview.totals.media)}</dd>
              </div>
              <div>
                <dt>Despesas pagas</dt>
                <dd>{formatCurrency(preview.totals.expenses_paid)}</dd>
              </div>
            </dl>
            {preview.entityRenames.length > 0 ? (
              <p className="text-muted mt-2 text-sm">
                Nomes já usados no destino serão ajustados (ex.:{" "}
                {preview.entityRenames
                  .slice(0, 2)
                  .map((rename) => `“${rename.from}” → “${rename.to}”`)
                  .join("; ")}
                {preview.entityRenames.length > 2 ? "…" : ""}).
              </p>
            ) : null}
          </section>
          <div className="flex justify-end">
            <ConfirmDialog
              className="button button--danger"
              confirmLabel="Transferir dados"
              confirmation={`${preview.counts.entities} empresa(s)/marca(s), ${preview.counts.services} serviço(s), ${preview.counts.charges} cobrança(s), ${preview.counts.expenses} despesa(s), ${preview.counts.domains} domínio(s) e ${preview.counts.contacts} contato(s) passam para ${preview.target.name}. A origem fica arquivada se ficar vazia. Não há como desfazer.`}
              holdSeconds={3}
              icon="archive"
              label="Transferir dados"
              requiredPhrase={transferPhrase}
              title={`Transferir dados de ${preview.source.name}`}
            />
          </div>
        </form>
      ) : null}
    </>
  );
}
