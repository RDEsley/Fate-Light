import {
  deleteFiscalDocument,
  downloadFiscalDocument,
  uploadFiscalDocument,
} from "@/app/_actions/fiscal-documents";
import { SubmitButton } from "@/app/_components/submit-button";

import { ConfirmDialog } from "./confirm-dialog";
import { Icon } from "./icon";

export type FiscalDocumentItem = {
  createdAt: string;
  id: string;
  mimeType: string;
  sizeBytes: number;
};

export function FiscalDocumentPanel({
  documents,
  entityId,
  entityType,
}: {
  documents: FiscalDocumentItem[];
  entityId: string;
  entityType: "charge" | "expense";
}) {
  return (
    <details className="fiscal-documents">
      <summary>
        <span>
          <Icon className="size-4" name="paperclip" /> Nota fiscal
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
                  <strong>Nota fiscal</strong>
                  <small>
                    {document.mimeType === "application/pdf" ? "PDF" : "Imagem"} ·{" "}
                    {(document.sizeBytes / 1024).toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    KB · {new Date(document.createdAt).toLocaleDateString("pt-BR")}
                  </small>
                </span>
                <form action={downloadFiscalDocument}>
                  <input name="entityType" type="hidden" value={entityType} />
                  <input name="id" type="hidden" value={document.id} />
                  <button
                    aria-label="Baixar nota fiscal"
                    className="fiscal-documents__action"
                    type="submit"
                  >
                    <Icon className="size-4" name="download" />
                  </button>
                </form>
                <form action={deleteFiscalDocument}>
                  <input name="entityType" type="hidden" value={entityType} />
                  <input name="id" type="hidden" value={document.id} />
                  <ConfirmDialog
                    className="fiscal-documents__action fiscal-documents__action--danger"
                    confirmLabel="Excluir anexo"
                    confirmation="A nota fiscal será removida do armazenamento privado. Esta ação não pode ser desfeita."
                    icon="trash"
                    label="Excluir"
                    title="Remover nota fiscal"
                  />
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fiscal-documents__empty">Nenhuma nota fiscal anexada a este pagamento.</p>
        )}
        <form action={uploadFiscalDocument} className="fiscal-documents__upload">
          <input name="entityId" type="hidden" value={entityId} />
          <input name="entityType" type="hidden" value={entityType} />
          <label>
            <span className="sr-only">Escolher nota fiscal</span>
            <input
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              name="file"
              required
              type="file"
            />
          </label>
          <SubmitButton idleLabel="Anexar NF" pendingLabel="Enviando…" />
        </form>
        <p className="fiscal-documents__hint">PDF ou imagem de até 4 MB · acesso privado</p>
      </div>
    </details>
  );
}
