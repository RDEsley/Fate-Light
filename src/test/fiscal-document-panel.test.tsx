import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/_actions/fiscal-documents", () => ({
  deleteFiscalDocument: vi.fn(),
  downloadFiscalDocument: vi.fn(),
  uploadFiscalDocument: vi.fn(),
}));

import { FiscalDocumentPanel } from "@/components/ui/fiscal-document-panel";

describe("fiscal document panel", () => {
  it("oferece anexo privado com formatos e limite visíveis", () => {
    const { container } = render(
      <FiscalDocumentPanel documents={[]} entityId="charge-id" entityType="charge" />,
    );

    expect(screen.getByText("Nota fiscal")).toBeInTheDocument();
    expect(screen.getByText(/PDF ou imagem de até 4 MB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anexar NF" })).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeRequired();
  });

  it("lista o documento com ações acessíveis de baixar e excluir", () => {
    const { container } = render(
      <FiscalDocumentPanel
        documents={[
          {
            createdAt: "2026-08-19T12:00:00.000Z",
            id: "document-id",
            mimeType: "application/pdf",
            sizeBytes: 2048,
          },
        ]}
        entityId="expense-id"
        entityType="expense"
      />,
    );

    expect(screen.getByText("1 anexo")).toBeInTheDocument();
    expect(container.querySelector(".fiscal-documents__list small")).toHaveTextContent(
      "PDF · 2 KB",
    );
    expect(screen.getByRole("button", { name: "Baixar nota fiscal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });
});
