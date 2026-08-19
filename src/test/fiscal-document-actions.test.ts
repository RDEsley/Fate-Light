import { vi } from "vitest";

const documentMocks = vi.hoisted(() => {
  const chain = {
    delete: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  const bucket = {
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
  };
  return {
    bucket,
    chain,
    from: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
    storageFrom: vi.fn(),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: documentMocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: documentMocks.redirect }));
vi.mock("@/lib/auth/workspace-context", () => ({
  requireWorkspaceContext: vi.fn(async () => ({
    supabase: {
      from: documentMocks.from,
      storage: { from: documentMocks.storageFrom },
    },
    userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })),
}));

import {
  deleteFiscalDocument,
  downloadFiscalDocument,
  uploadFiscalDocument,
} from "@/app/_actions/fiscal-documents";

const chargeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const documentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function pdfForm() {
  const formData = new FormData();
  formData.set("entityId", chargeId);
  formData.set("entityType", "charge");
  formData.set(
    "file",
    new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "nota.pdf", {
      type: "application/pdf",
    }),
  );
  return formData;
}

function documentForm(entityType: "charge" | "expense" = "charge") {
  const formData = new FormData();
  formData.set("entityType", entityType);
  formData.set("id", documentId);
  return formData;
}

describe("fiscal document actions", () => {
  beforeEach(() => {
    for (const mock of [
      ...Object.values(documentMocks.chain),
      ...Object.values(documentMocks.bucket),
      documentMocks.from,
      documentMocks.redirect,
      documentMocks.revalidatePath,
      documentMocks.storageFrom,
    ]) {
      mock.mockReset();
    }
    documentMocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    documentMocks.from.mockReturnValue(documentMocks.chain);
    documentMocks.chain.select.mockReturnValue(documentMocks.chain);
    documentMocks.chain.eq.mockReturnValue(documentMocks.chain);
    documentMocks.chain.delete.mockReturnValue(documentMocks.chain);
    documentMocks.chain.insert.mockResolvedValue({ error: null });
    documentMocks.chain.single.mockResolvedValue({
      data: { id: chargeId, status: "paid" },
      error: null,
    });
    documentMocks.storageFrom.mockReturnValue(documentMocks.bucket);
    documentMocks.bucket.upload.mockResolvedValue({ error: null });
    documentMocks.bucket.remove.mockResolvedValue({ error: null });
  });

  it("anexa uma NF válida somente depois de confirmar que a cobrança está paga", async () => {
    await expect(uploadFiscalDocument(pdfForm())).rejects.toThrow(
      "REDIRECT:/cobrancas?status=invoice-uploaded",
    );

    expect(documentMocks.from).toHaveBeenNthCalledWith(1, "charges");
    expect(documentMocks.bucket.upload).toHaveBeenCalledWith(
      expect.stringContaining(`/fiscal/charge/${chargeId}/`),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "application/pdf", upsert: false }),
    );
    expect(documentMocks.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        charge_id: chargeId,
        expense_id: null,
        mime_type: "application/pdf",
        workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    );
    expect(documentMocks.revalidatePath).toHaveBeenCalledWith("/cobrancas");
  });

  it("bloqueia o anexo quando a conta ainda não está paga", async () => {
    documentMocks.chain.single.mockResolvedValue({
      data: { id: chargeId, status: "pending" },
      error: null,
    });

    await expect(uploadFiscalDocument(pdfForm())).rejects.toThrow(
      "REDIRECT:/cobrancas?status=invoice-unavailable",
    );
    expect(documentMocks.bucket.upload).not.toHaveBeenCalled();
    expect(documentMocks.chain.insert).not.toHaveBeenCalled();
  });

  it("gera uma URL temporária para baixar sem tornar o bucket público", async () => {
    documentMocks.chain.single.mockResolvedValue({
      data: { bucket: "workspace-documents", object_path: "workspace/fiscal/nota.pdf" },
      error: null,
    });
    documentMocks.bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.test/signed" },
      error: null,
    });

    await expect(downloadFiscalDocument(documentForm())).rejects.toThrow(
      "REDIRECT:https://storage.example.test/signed",
    );
    expect(documentMocks.bucket.createSignedUrl).toHaveBeenCalledWith(
      "workspace/fiscal/nota.pdf",
      300,
      { download: true },
    );
  });

  it("remove o objeto privado e seus metadados", async () => {
    documentMocks.chain.single.mockResolvedValue({
      data: { bucket: "workspace-documents", object_path: "workspace/fiscal/nota.pdf" },
      error: null,
    });

    await expect(deleteFiscalDocument(documentForm("expense"))).rejects.toThrow(
      "REDIRECT:/despesas?status=invoice-deleted",
    );
    expect(documentMocks.bucket.remove).toHaveBeenCalledWith(["workspace/fiscal/nota.pdf"]);
    expect(documentMocks.chain.delete).toHaveBeenCalled();
    expect(documentMocks.revalidatePath).toHaveBeenCalledWith("/despesas");
  });
});
