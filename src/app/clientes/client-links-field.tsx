"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { maxClientLinks, type ClientLink } from "@/features/clients/schemas";

/**
 * Endereços extras do cliente. Começa com uma linha vazia para o campo existir mesmo
 * quando não há nada salvo — sem isso o usuário não descobre que a opção está aqui.
 */
export function ClientLinksField({ links = [] }: { links?: ClientLink[] }) {
  const [rows, setRows] = useState<ClientLink[]>(links.length ? links : [{ label: "", url: "" }]);

  const update = (index: number, field: keyof ClientLink, value: string) => {
    setRows((current) =>
      current.map((row, position) => (position === index ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div className="client-links">
      {rows.map((row, index) => (
        <div className="client-links__row" key={index}>
          <label className="field">
            <span className="field__label">
              Nome do link <span className="field__optional">opcional</span>
            </span>
            <input
              maxLength={40}
              name="linkLabel"
              onChange={(event) => update(index, "label", event.target.value)}
              placeholder="Ex.: Painel do registrador"
              value={row.label}
            />
          </label>
          <label className="field">
            <span className="field__label">
              Endereço <span className="field__optional">opcional</span>
            </span>
            <input
              maxLength={253}
              name="linkUrl"
              onChange={(event) => update(index, "url", event.target.value)}
              placeholder="Ex.: painel.registrador.com/cliente"
              value={row.url}
            />
          </label>
          {rows.length > 1 ? (
            <button
              aria-label={`Remover link ${index + 1}`}
              className="client-links__remove"
              onClick={() => setRows((current) => current.filter((_, at) => at !== index))}
              type="button"
            >
              <Icon className="size-4" name="trash" />
            </button>
          ) : null}
        </div>
      ))}
      {rows.length < maxClientLinks ? (
        <button
          className="client-links__add"
          onClick={() => setRows((current) => [...current, { label: "", url: "" }])}
          type="button"
        >
          <Icon className="size-4" name="plus" /> Adicionar outro link
        </button>
      ) : (
        <p className="field__hint">Limite de {maxClientLinks} links por cliente.</p>
      )}
    </div>
  );
}
