"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { ClientCombobox, type ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
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
  const [confirmState, confirmAction] = useActionState(
    transferClientData,
    initialTransferState,
  );

  const preview = previewState.status === "preview" ? previewState.preview : undefined;
  const error =
    confirmState.status === "error"
      ? confirmState.message
      : previewState.status === "error"
        ? previewState.message
        : undefined;

  if (!clients.length) {
    return (
      <p className="helper-note">
        <Icon className="size-4" name="info" /> Não há outro cliente disponível para receber os
        dados deste.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-muted max-w-2xl text-sm">
        <strong className="text-foreground">Transferir dados deste cliente para…</strong> move
        empresas/marcas, contatos, serviços, cobranças, despesas e domínios de {sourceClientName}{" "}
        para outro cadastro. Nenhum valor é recalculado; o histórico de eventos permanece na origem.
      </p>

      {error ? <FeedbackBanner message={error} tone="error" /> : null}

      <form action={previewAction} className="form-grid sm:grid-cols-2">
        <input name="sourceClientId" type="hidden" value={sourceClientId} />
        <ClientCombobox
          clients={clients}
          defaultFilter="all"
          label="Cliente de destino"
          name="targetClientId"
        />
        <div className="sm:col-span-2">
          <SubmitButton idleLabel="Ver prévia" pendingLabel="Calculando…" />
        </div>
      </form>

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
          <div>
            <ConfirmDialog
              className="danger-action"
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
    </div>
  );
}
