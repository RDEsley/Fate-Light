import { inspectFiscalDocument } from "@/features/documents/fiscal-document";

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("fiscal document inspection", () => {
  it.each([
    [[0x25, 0x50, 0x44, 0x46, 0x2d], "nota.pdf", "application/pdf", "pdf"],
    [[0xff, 0xd8, 0xff, 0xdb], "nota.jpeg", "image/jpeg", "jpeg"],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "nota.png", "image/png", "png"],
    [
      [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
      "nota.webp",
      "image/webp",
      "webp",
    ],
  ] as const)(
    "aceita conteúdo e extensão coerentes em %s",
    async (bytes, name, type, extension) => {
      await expect(inspectFiscalDocument(file([...bytes], name, type))).resolves.toEqual({
        extension,
        ok: true,
      });
    },
  );

  it("recusa um executável disfarçado de PDF", async () => {
    await expect(
      inspectFiscalDocument(file([0x4d, 0x5a, 0x90, 0], "nota.pdf", "application/pdf")),
    ).resolves.toEqual({ code: "type", ok: false });
  });

  it("recusa extensão incompatível com o MIME type", async () => {
    await expect(
      inspectFiscalDocument(file([0x25, 0x50, 0x44, 0x46, 0x2d], "nota.png", "application/pdf")),
    ).resolves.toEqual({ code: "type", ok: false });
  });

  it("recusa arquivo vazio e arquivo acima de 4 MB", async () => {
    await expect(inspectFiscalDocument(file([], "nota.pdf", "application/pdf"))).resolves.toEqual({
      code: "empty",
      ok: false,
    });
    await expect(
      inspectFiscalDocument(
        new File([new Uint8Array(4 * 1024 * 1024 + 1)], "nota.pdf", {
          type: "application/pdf",
        }),
      ),
    ).resolves.toEqual({ code: "size", ok: false });
  });
});
