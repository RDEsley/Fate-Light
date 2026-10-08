"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { ClientCombobox, type ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { useErrorToast } from "@/components/ui/use-error-toast";
import { clientEntityTypeOptions, consolidationPhrase } from "@/features/clients/entity-schemas";
import { formatCurrency } from "@/features/mvp/format";

import { consolidateClient, previewConsolidateClient } from "./entity-actions";
import { initialConsolidationState } from "./consolidation-state";

/**
 * Consolidação de um cliente legado em empresa/marca deste cliente. O caminho é sempre
 * prévia → confirmação por frase: mover serviços, cobranças, despesas e domínios de um
 * cadastro para outro não pode acontecer em um clique só.
 */
export function ConsolidateClientPanel({
  clients,
  targetClientId,
  targetClientName,
}: {
  clients: ClientOption[];
  targetClientId: string;
  targetClientName: string;
}) {
  const [previewState, previewAction] = useActionState(
    previewConsolidateClient,
    initialConsolidationState,
  );
  const [confirmState, confirmAction] = useActionState(
    consolidateClient,
    initialConsolidationState,
  );
  const [displayName, setDisplayName] = useState("");
  const [entityType, setEntityType] = useState("company");
  useErrorToast(previewState);
  useErrorToast(confirmState);

  const preview = previewState.status === "preview" ? previewState.preview : undefined;

  if (!clients.length) {
    return (
      <p className="helper-note">
        <Icon className="size-4" name="info" /> Não há outro cliente disponível para consolidar
        neste.
      </p>
    );
  }

  return (
    <>
      <Form action={previewAction} className="grid gap-4">
        <input name="targetClientId" type="hidden" value={targetClientId} />
        <div className="form-grid sm:grid-cols-2 lg:grid-cols-12">
          <ClientCombobox
            className="sm:col-span-2 lg:col-span-5"
            clients={clients}
            defaultFilter="all"
            hint={`O cadastro antigo vira empresa/marca de ${targetClientName} e fica arquivado. Serviços, cobranças, despesas e domínios mudam de dono; nenhum valor é recalculado.`}
            label="Cliente de origem"
            name="sourceClientId"
            // Sugere o nome do cadastro antigo sem pisar no que já foi digitado.
            onSelect={(client) => {
              if (client && !displayName.trim()) setDisplayName(client.name);
            }}
          />
          <TextField
            className="lg:col-span-4"
            label="Nome da empresa/marca resultante"
            maxLength={160}
            minLength={2}
            name="displayName"
            onValueChange={setDisplayName}
            placeholder="Ex.: Padaria do Bairro"
            required
            value={displayName}
          />
          <SelectField
            className="lg:col-span-3"
            label="Tipo"
            name="entityType"
            onValueChange={setEntityType}
            options={clientEntityTypeOptions}
            value={entityType}
          />
        </div>
        <FormActions>
          <SubmitButton idleLabel="Ver prévia" pendingLabel="Calculando…" />
        </FormActions>
      </Form>

      {preview ? (
        <form action={confirmAction} className="grid gap-3">
          <input name="displayName" type="hidden" value={displayName || preview.source.name} />
          <input name="entityType" type="hidden" value={entityType} />
          <input name="sourceClientId" type="hidden" value={preview.source.id} />
          <input name="targetClientId" type="hidden" value={targetClientId} />
          <section className="consolidation-preview" aria-live="polite">
            <p>
              <strong>{preview.source.name}</strong> passa a ser{" "}
              <strong>{displayName || preview.source.name}</strong> dentro de{" "}
              <strong>{preview.target.name}</strong>.
            </p>
            <dl>
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
              <div>
                <dt>Contatos preservados na origem</dt>
                <dd>{preview.counts.contacts}</dd>
              </div>
            </dl>
          </section>
          <div className="flex justify-end">
            <ConfirmDialog
              className="button button--danger"
              confirmLabel="Consolidar cliente"
              confirmation={`${preview.counts.services} serviço(s), ${preview.counts.charges} cobrança(s), ${preview.counts.expenses} despesa(s) e ${preview.counts.domains} domínio(s) passam para ${preview.target.name}. O cliente de origem é arquivado; seus contatos e eventos históricos permanecem preservados. Não há como desfazer.`}
              holdSeconds={3}
              icon="archive"
              label="Consolidar cliente"
              phraseFieldName="confirmation"
              requiredPhrase={consolidationPhrase}
              title={`Consolidar ${preview.source.name}`}
            />
          </div>
        </form>
      ) : null}
    </>
  );
}
