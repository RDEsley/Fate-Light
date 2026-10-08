"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { clientEntityTypeOptions, maxNewClientEntities } from "@/features/clients/entity-schemas";

type EntityRow = { key: number; name: string; type: string };

/**
 * Empresas, marcas ou projetos informados já no cadastro do cliente. Só nome e tipo:
 * dados fiscais e de contato de cada uma ficam para a edição, quando forem necessários.
 */
export function ClientEntitiesField() {
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [nextKey, setNextKey] = useState(0);

  const update = (key: number, field: "name" | "type", value: string) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  };

  return (
    <div className="repeat-list">
      {rows.map((row, index) => (
        <div className="repeat-row" key={row.key}>
          <TextField
            fieldKey={`entityName:${index}`}
            label="Nome da empresa ou marca"
            maxLength={160}
            name="entityName"
            onValueChange={(value) => update(row.key, "name", value)}
            placeholder="Ex.: Padaria do Bairro"
            value={row.name}
          />
          <SelectField
            label="Tipo"
            name="entityType"
            onValueChange={(value) => update(row.key, "type", value)}
            options={clientEntityTypeOptions}
            value={row.type}
          />
          <button
            aria-label={`Remover empresa ou marca ${index + 1}`}
            className="repeat-row__remove"
            onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
            type="button"
          >
            <Icon className="size-4" name="trash" />
          </button>
        </div>
      ))}
      {rows.length < maxNewClientEntities ? (
        <button
          className="repeat-add"
          onClick={() => {
            setRows((current) => [...current, { key: nextKey, name: "", type: "company" }]);
            setNextKey((key) => key + 1);
          }}
          type="button"
        >
          <Icon className="size-4" name="plus" />
          {rows.length ? "Adicionar outra" : "Adicionar empresa/marca"}
        </button>
      ) : (
        <p className="field__hint">
          Limite de {maxNewClientEntities} por cadastro. As demais podem ser criadas depois, em
          Editar cliente.
        </p>
      )}
    </div>
  );
}
