/**
 * Escape de metacaracteres do padrão ILIKE do Postgres/PostgREST.
 */
export function escapeIlikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Cláusula `or` do PostgREST para colunas textuais da própria tabela.
 */
export function textSearchOrFilter(columns: string[], query: string) {
  const pattern = `%${escapeIlikePattern(query)}%`;
  return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}

/**
 * Acrescenta `column.in.(id1,id2)` quando há IDs relacionados que batem na busca.
 */
export function appendIdInFilter(parts: string[], column: string, ids: string[]) {
  if (!ids.length) return;
  parts.push(`${column}.in.(${ids.join(",")})`);
}

export function idsMatchingText<T extends Record<string, unknown>>(
  rows: T[] | null | undefined,
  query: string,
  fields: (keyof T)[],
  idField: keyof T = "id" as keyof T,
) {
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  if (!needle) return [] as string[];
  return (rows ?? [])
    .filter((row) =>
      fields.some((field) => {
        const value = row[field];
        return typeof value === "string" && value.toLocaleLowerCase("pt-BR").includes(needle);
      }),
    )
    .map((row) => String(row[idField]));
}
