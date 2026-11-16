import {
  deleteFiscalDocument,
  downloadFiscalDocument,
  uploadFiscalDocument,
} from "@/app/_actions/fiscal-documents";
import { SubmitButton } from "@/app/_components/submit-button";
import type { FiscalDocumentKind } from "@/features/documents/fiscal-document";
import { formatDatePtBr } from "@/features/mvp/format";

import { ConfirmDialog } from "./confirm-dialog";
import { Icon } from "./icon";

export type FiscalDocumentItem = {
  /** Dia do anexo (YYYY-MM-DD), já no fuso do workspace. */
  createdAt: string;
  id: string;
  /** Nota fiscal ou comprovante: cada tipo tem o seu painel. */
  kind: FiscalDocumentKind;
  mimeType: string;
  sizeBytes: number;
};

const copy: Record<
  FiscalDocumentKind,
  {
    attach: string;
    confirmation: string;
    confirmLabel: string;
    download: string;
    empty: string;
    item: string;
    pick: string;
    removeTitle: string;
    title: string;
  }
> = {
  invoice: {
    attach: "Anexar NF",
    confirmation:
      "A nota fiscal será removida do armazenamento privado. Esta ação não pode ser desfeita.",
    confirmLabel: "Excluir anexo",
    download: "Baixar nota fiscal",
    empty: "Nenhuma nota fiscal anexada a este pagamento.",
    item: "Nota fiscal",
    pick: "Escolher nota fiscal",
    removeTitle: "Remover nota fiscal",
    title: "Nota fiscal",
  },
  payment_proof: {
    attach: "Anexar comprovante",
    confirmation:
      "O comprovante será removido do armazenamento privado. Esta ação não pode ser desfeita.",
    confirmLabel: "Excluir comprovante",
    download: "Baixar comprovante",
    empty: "Nenhum comprovante anexado a este pagamento.",
    item: "Comprovante",
    pick: "Escolher comprovante",
    removeTitle: "Remover comprovante",
    title: "Comprovante de pagamento",
  },
};

export function FiscalDocumentPanel({
  documents,
  entityId,
  entityType,
  kind = "invoice",
  returnTo,
}: {
  documents: FiscalDocumentItem[];
  entityId: string;
  entityType: "charge" | "expense";
  /** Padrão: nota fiscal. `payment_proof` só existe para cobranças. */
  kind?: FiscalDocumentKind;
  /** Tela para onde a ação volta; sem ela, a lista de cobranças ou de despesas. */
  returnTo?: string;
}) {
  const labels = copy[kind];
  const back = (
    <>
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <input name="kind" type="hidden" value={kind} />
    </>
  );
  return (
    <details className="fiscal-documents">
      <summary>
        <span>
          <Icon className="size-4" name="paperclip" /> {labels.title}
        </span>
        <span className="fiscal-documents__count">
          {documents.length
            ? `${documents.length} anexo${documents.length > 1 ? "s" : ""}`
            : "Anexar"}
          <Icon className="size-4" name="chevron-down" />
        </span>
      </summary>
      <div className="fiscal-documents__body">
        {documents.length ? (
          <ul className="fiscal-documents__list">
            {documents.map((document) => (
              <li key={document.id}>
                <span className="fiscal-documents__file-icon">
                  <Icon className="size-4" name="file" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{labels.item}</strong>
                  <small>
                    {document.mimeType === "application/pdf" ? "PDF" : "Imagem"} ·{" "}
                    {(document.sizeBytes / 1024).toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    KB · {formatDatePtBr(document.createdAt)}
                  </small>
                </span>
                <form action={downloadFiscalDocument}>
                  {back}
                  <input name="entityType" type="hidden" value={entityType} />
                  <input name="id" type="hidden" value={document.id} />
                  <button
                    aria-label={labels.download}
                    className="fiscal-documents__action"
                    type="submit"
                  >
                    <Icon className="size-4" name="download" />
                  </button>
                </form>
                <form action={deleteFiscalDocument}>
                  {back}
                  <input name="entityType" type="hidden" value={entityType} />
                  <input name="id" type="hidden" value={document.id} />
                  <ConfirmDialog
                    className="fiscal-documents__action fiscal-documents__action--danger"
                    confirmLabel={labels.confirmLabel}
                    confirmation={labels.confirmation}
                    icon="trash"
                    label="Excluir"
                    title={labels.removeTitle}
                  />
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fiscal-documents__empty">{labels.empty}</p>
        )}
        <form action={uploadFiscalDocument} className="fiscal-documents__upload">
          {back}
          <input name="entityId" type="hidden" value={entityId} />
          <input name="entityType" type="hidden" value={entityType} />
          <label>
            <span className="sr-only">{labels.pick}</span>
            <input
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              name="file"
              required
              type="file"
            />
          </label>
          <SubmitButton idleLabel={labels.attach} pendingLabel="Enviando…" />
        </form>
        <p className="fiscal-documents__hint">PDF ou imagem de até 4 MB · acesso privado</p>
      </div>
    </details>
  );
}
