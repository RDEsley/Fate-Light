import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { donationCode, parseDonation } from "@/features/support/donation";
import { DonationPanel } from "@/features/support/donation-panel";
import { buildPixCode, crc16 } from "@/features/support/pix";

const free =
  "00020126580014br.gov.bcb.pix013635f6734f-2587-4139-8e9b-0ed7a4436a7a5204000053039865802BR5924RICHARD ESLEY S OLIVEIRA6008BRASILIA62130509FATELIGHT630485A7";
const ten =
  "00020126580014br.gov.bcb.pix013635f6734f-2587-4139-8e9b-0ed7a4436a7a520400005303986540510.005802BR5924RICHARD ESLEY S OLIVEIRA6008BRASILIA62130509FATELIGHT6304428B";

describe("código Pix", () => {
  it("calcula o CRC e reproduz o exemplo do Banco Central", () => {
    expect(crc16("123456789")).toBe("29B1");
    expect(
      buildPixCode({
        key: "123e4567-e12b-12d1-a456-426655440000",
        receiverName: "Fulano de Tal",
        receiverCity: "BRASILIA",
      }),
    ).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("monta o código da doação com e sem valor", () => {
    expect(donationCode(null)).toBe(free);
    expect(donationCode(10)).toBe(ten);
  });

  it("remove acentos e símbolos e limita nome, cidade e identificador", () => {
    const code = buildPixCode({
      key: " chave ",
      receiverName: "José da Conceição Albuquerque Júnior",
      receiverCity: "São José dos Campos",
      txid: "meu app-2026!",
      amount: Number.NaN,
    });

    expect(code).toContain("0105chave");
    expect(code).toContain("5925Jose da Conceicao Albuque");
    expect(code).toContain("6015Sao Jose dos Ca");
    expect(code).toContain("0510meuapp2026");
    expect(code).not.toContain("5303986540");
    expect(crc16(code.slice(0, -4))).toBe(code.slice(-4));
  });

  it("lê o valor digitado sem nunca tomar ponto por milhar", () => {
    expect(parseDonation("15,50")).toBe(15.5);
    expect(parseDonation("15.50")).toBe(15.5);
    expect(parseDonation(" 7 ")).toBe(7);
    expect(parseDonation("5000")).toBe(5000);
    for (const text of ["1.500", "1,500", "abc", "", "0", "0,00", "5000,01", "-5"]) {
      expect(parseDonation(text)).toBeNull();
    }
  });
});

describe("DonationPanel", () => {
  it("troca o código conforme o valor escolhido e recusa valor ambíguo", async () => {
    const user = userEvent.setup();
    render(<DonationPanel />);

    expect(screen.getByRole("img", { name: "QR Code do Pix" })).toBeInTheDocument();
    expect(screen.getByText(free)).toBeInTheDocument();
    expect(screen.getByText("Você escolhe o valor no app do banco.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /10,00/ }));
    expect(screen.getByText(ten)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Outro valor" }));
    const amount = screen.getByLabelText("Valor em reais");
    await user.type(amount, "1.500");
    expect(screen.getByText(/Use só números/)).toBeInTheDocument();
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(free)).toBeInTheDocument();

    await user.clear(amount);
    await user.type(amount, "15,50");
    expect(screen.getByText(/5303986540515\.505802BR/)).toBeInTheDocument();
  });

  it("copia o código e avisa quando a área de transferência é negada", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<DonationPanel />);

    await user.click(screen.getByRole("button", { name: "Copiar código Pix" }));
    expect(writeText).toHaveBeenCalledWith(free);
    expect(await screen.findByRole("button", { name: "Código copiado" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /5,00/ }));
    await user.click(screen.getByRole("button", { name: "Copiar código Pix" }));
    expect(await screen.findByText(/Não deu para copiar/)).toBeInTheDocument();
  });
});
