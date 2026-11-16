"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";

/**
 * Texto do modelo para colar na Meta. O sistema só guarda o NOME do modelo; este cartão mostra
 * o que escrever lá e como o cliente vai ler, para ninguém precisar adivinhar.
 */
export function TemplateGuideCard({ body, preview }: { body: string; preview: string }) {
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied("done");
    } catch {
      // Sem permissão da área de transferência o texto continua visível para copiar à mão.
      setCopied("failed");
    }
  }

  return (
    <details className="whatsapp-guide sm:col-span-2">
      <summary>Ver o texto para cadastrar na Meta</summary>
      <div className="whatsapp-guide__body">
        <p className="whatsapp-preview__label">Cole este texto ao criar o modelo na Meta</p>
        <p className="whatsapp-guide__code">{body}</p>
        <button className="button button--secondary button--small" onClick={copy} type="button">
          <Icon className="size-4" name="file" />
          Copiar texto
        </button>
        <span aria-live="polite" className="text-muted text-xs">
          {copied === "done" ? "Texto copiado." : null}
          {copied === "failed" ? "Não consegui copiar; selecione o texto acima." : null}
        </span>
        <p className="whatsapp-preview__label mt-2">
          Como o cliente vai ler (com dados de exemplo)
        </p>
        <p className="whatsapp-preview__bubble">{preview}</p>
      </div>
    </details>
  );
}
