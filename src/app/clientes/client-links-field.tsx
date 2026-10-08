"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { maxClientLinks, type ClientLink } from "@/features/clients/schemas";

type LinkRow = ClientLink & { key: number };

/**
 * Endereços extras do cliente. Nasce vazio, com o botão de adicionar à vista: uma linha
 * em branco permanente ocupava espaço em todo cadastro que não usa links.
 */
export function ClientLinksField({ links = [] }: { links?: ClientLink[] }) {
  const [rows, setRows] = useState<LinkRow[]>(() =>
    links.map((link, index) => ({ ...link, key: index })),
  );
  const [nextKey, setNextKey] = useState(links.length);

  const update = (key: number, field: keyof ClientLink, value: string) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div className="repeat-list">
      {rows.map((row, index) => (
        <div className="repeat-row repeat-row--wide-last" key={row.key}>
          <TextField
            fieldKey={`linkLabel:${index}`}
            label="Nome do link"
            maxLength={40}
            name="linkLabel"
            onValueChange={(value) => update(row.key, "label", value)}
            placeholder="Ex.: Painel do registrador"
            value={row.label}
          />
          <TextField
            fieldKey={`linkUrl:${index}`}
            label="Endereço"
            maxLength={253}
            name="linkUrl"
            onValueChange={(value) => update(row.key, "url", value)}
            placeholder="Ex.: painel.registrador.com/cliente"
            value={row.url}
          />
          <button
            aria-label={`Remover link ${index + 1}`}
            className="repeat-row__remove"
            onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
            type="button"
          >
            <Icon className="size-4" name="trash" />
          </button>
        </div>
      ))}
      {rows.length < maxClientLinks ? (
        <button
          className="repeat-add"
          onClick={() => {
            setRows((current) => [...current, { key: nextKey, label: "", url: "" }]);
            setNextKey((key) => key + 1);
          }}
          type="button"
        >
          <Icon className="size-4" name="plus" />
          {rows.length ? "Adicionar outro link" : "Adicionar link"}
        </button>
      ) : (
        <p className="field__hint">Limite de {maxClientLinks} links por cliente.</p>
      )}
    </div>
  );
}
