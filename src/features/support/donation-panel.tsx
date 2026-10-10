"use client";

import { useId, useState } from "react";

import { Field } from "@/components/ui/field";

import { donation, donationCode, formatDonation, parseDonation } from "./donation";
import { PixQrCode } from "./pix-qr-code";

type Choice = "bank" | "custom" | `${number}`;

/**
 * Doação por Pix ao desenvolvedor: valor sugerido ou livre, QR Code e código para copiar.
 * Nada é enviado ao sistema; o pagamento acontece no app do banco de quem doa.
 */
export function DonationPanel() {
  const groupId = useId();
  const amountId = useId();
  const [choice, setChoice] = useState<Choice>("bank");
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState<"done" | "failed" | "idle">("idle");

  const amount =
    choice === "custom" ? parseDonation(custom) : choice === "bank" ? null : Number(choice);
  const refused = choice === "custom" && custom !== "" && amount === null;
  const code = donationCode(amount);
  const options: { label: string; value: Choice }[] = [
    ...donation.suggestedAmounts.map((value) => ({
      label: formatDonation(value),
      value: `${value}` as const,
    })),
    { label: "Outro valor", value: "custom" },
    { label: "Decidir no banco", value: "bank" },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("done");
    } catch {
      // Sem permissão de área de transferência o código continua visível para copiar à mão.
      setCopied("failed");
    }
  }

  return (
    <section aria-label="Doar por Pix" className="panel-card mt-6 grid gap-5 sm:p-6!">
      <p className="text-sm">
        Recebedor: <strong>{donation.receiver}</strong>
      </p>

      <div aria-labelledby={groupId} className="field" role="radiogroup">
        <span className="field__label" id={groupId}>
          Valor
        </span>
        <div className="chip-group">
          {options.map((option) => (
            <label className="chip" key={option.value}>
              <input
                checked={choice === option.value}
                name="donation-amount"
                onChange={() => {
                  setChoice(option.value);
                  setCopied("idle");
                }}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {choice === "custom" ? (
        <Field
          className="max-w-56"
          error={
            refused
              ? `Use só números, como 15 ou 15,50 (máximo de ${formatDonation(donation.maxAmount)}).`
              : undefined
          }
          errorId={`${amountId}-error`}
          htmlFor={amountId}
          label="Valor em reais"
        >
          <input
            aria-describedby={refused ? `${amountId}-error` : undefined}
            aria-invalid={refused || undefined}
            id={amountId}
            inputMode="decimal"
            onChange={(event) => {
              setCustom(event.target.value);
              setCopied("idle");
            }}
            placeholder="Ex.: 15,00"
            value={custom}
          />
        </Field>
      ) : null}

      <PixQrCode value={code} />
      <p className="text-muted text-center text-sm">
        {amount === null ? (
          "Você escolhe o valor no app do banco."
        ) : (
          <>
            Valor: <strong className="text-foreground">{formatDonation(amount)}</strong>
          </>
        )}
      </p>

      <code className="bg-background rounded-xl border p-3 text-xs leading-5 break-all select-all">
        {code}
      </code>
      <button className="button button--primary w-full" onClick={copy} type="button">
        {copied === "done" ? "Código copiado" : "Copiar código Pix"}
      </button>
      <p aria-live="polite" className="text-muted -mt-2 text-center text-sm">
        {copied === "failed" ? "Não deu para copiar. Selecione o código acima e copie." : ""}
      </p>

      <ol className="text-muted list-decimal space-y-1 pl-5 text-sm leading-6">
        <li>No app do seu banco, abra o Pix e escolha “Ler QR Code” ou “Pix Copia e Cola”.</li>
        <li>
          Confira o nome do recebedor: <strong>{donation.receiver}</strong>. Se aparecer outro nome,
          não confirme.
        </li>
        <li>Confirme o valor e conclua. Muito obrigado.</li>
      </ol>
    </section>
  );
}
