// A Vercel Function aceita no máximo 4,5 MB de payload. O teto menor inclui a
// sobrecarga multipart do Server Action e evita que um arquivo válido termine em 413.
const maxFiscalDocumentBytes = 4 * 1024 * 1024;

const acceptedTypes = {
  "application/pdf": {
    extensions: ["pdf"],
    matches: (bytes: Uint8Array) =>
      bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-",
  },
  "image/jpeg": {
    extensions: ["jpg", "jpeg"],
    matches: (bytes: Uint8Array) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extensions: ["png"],
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (value, index) => bytes[index] === value,
      ),
  },
  "image/webp": {
    extensions: ["webp"],
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
} as const;

export type FiscalDocumentInspection =
  | { extension: "jpeg" | "jpg" | "pdf" | "png" | "webp"; ok: true }
  | { code: "empty" | "size" | "type"; ok: false };

type FiscalDocumentExtension = Extract<FiscalDocumentInspection, { ok: true }>["extension"];

export async function inspectFiscalDocument(file: File): Promise<FiscalDocumentInspection> {
  if (file.size === 0) return { code: "empty", ok: false };
  if (file.size > maxFiscalDocumentBytes) return { code: "size", ok: false };

  const type = acceptedTypes[file.type as keyof typeof acceptedTypes];
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("en-US") ?? "";
  if (!type || !type.extensions.some((accepted) => accepted === extension)) {
    return { code: "type", ok: false };
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!type.matches(bytes)) return { code: "type", ok: false };

  return { extension: extension as FiscalDocumentExtension, ok: true };
}
