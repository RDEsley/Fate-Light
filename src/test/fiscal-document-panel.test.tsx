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
            createdAt: "2026-08-19",
            id: "document-id",
            kind: "invoice",
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
      "PDF · 2 KB · 19/08/2026",
    );
    expect(screen.getByRole("button", { name: "Baixar nota fiscal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("mostra o painel de comprovante com os textos e o tipo próprios", () => {
    const { container } = render(
      <FiscalDocumentPanel
        documents={[
          {
            createdAt: "2026-11-16",
            id: "proof-id",
            kind: "payment_proof",
            mimeType: "image/png",
            sizeBytes: 4096,
          },
        ]}
        entityId="charge-id"
        entityType="charge"
        kind="payment_proof"
      />,
    );

    expect(screen.getByText("Comprovante de pagamento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixar comprovante" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anexar comprovante" })).toBeInTheDocument();
    // Toda ação do painel diz o tipo, para a mensagem de retorno falar de comprovante.
    const kinds = Array.from(container.querySelectorAll('input[name="kind"]'));
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds.every((input) => (input as HTMLInputElement).value === "payment_proof")).toBe(
      true,
    );
  });

  it("sem comprovantes, explica que nada foi anexado", () => {
    render(
      <FiscalDocumentPanel
        documents={[]}
        entityId="charge-id"
        entityType="charge"
        kind="payment_proof"
      />,
    );
    expect(screen.getByText("Nenhum comprovante anexado a este pagamento.")).toBeInTheDocument();
  });
});
