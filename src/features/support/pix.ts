// Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
// O código é só um texto montado a partir da chave: não passa por servidor, e por isso
// o sistema não fica sabendo se alguém pagou.

export type PixRequest = {
  key: string;
  /** Até 25 caracteres, sem acentos. O banco mostra o nome real da conta. */
  receiverName: string;
  /** Até 15 caracteres, sem acentos. */
  receiverCity: string;
  /** Aparece no extrato do recebedor: até 25 letras ou números. */
  txid?: string;
  /** Em reais. Sem valor, quem paga digita no app do banco. */
  amount?: number;
};

const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;

const plain = (text: string, maxLength: number) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, maxLength);

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63. */
export function crc16(text: string) {
  let crc = 0xffff;
  for (const char of text) {
    crc ^= char.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixCode({ key, receiverName, receiverCity, txid = "", amount }: PixRequest) {
  const priced = amount !== undefined && Number.isFinite(amount) && amount > 0;
  const payload = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", key.trim())),
    field("52", "0000"),
    field("53", "986"),
    priced ? field("54", amount.toFixed(2)) : "",
    field("58", "BR"),
    field("59", plain(receiverName, 25)),
    field("60", plain(receiverCity, 15)),
    field("62", field("05", txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***")),
    "6304",
  ].join("");
  return payload + crc16(payload);
}
