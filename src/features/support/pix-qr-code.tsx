import qrcode from "qrcode-generator";

const quietZone = 4;

/** QR Code em SVG, sempre preto no branco para o leitor do banco reconhecer. */
export function PixQrCode({ value }: { value: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const total = count + quietZone * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) path += `M${column + quietZone} ${row + quietZone}h1v1h-1z`;
    }
  }

  return (
    <svg
      aria-label="QR Code do Pix"
      className="mx-auto h-auto w-full max-w-60 rounded-xl border bg-white"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${total} ${total}`}
    >
      <rect fill="#ffffff" height={total} width={total} />
      <path d={path} fill="#000000" />
    </svg>
  );
}
