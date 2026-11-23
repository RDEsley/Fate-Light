export type Inline = { text: string; type: "bold" | "code" | "text" };
export type Block =
  { inline: Inline[]; type: "paragraph" } | { items: Inline[][]; ordered: boolean; type: "list" };

const listItem = /^\s*(?:([-*•])|(\d{1,2})[.)])\s+(.*)$/;
const heading = /^\s{0,3}#{1,6}\s+(.*)$/;

/** Negrito (**texto**) e código (`texto`); o resto fica como texto, sem interpretar HTML. */
export function parseInline(source: string): Inline[] {
  const parts: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    if (match.index > cursor) parts.push({ text: source.slice(cursor, match.index), type: "text" });
    parts.push(
      match[1] === undefined
        ? { text: match[2] ?? "", type: "code" }
        : { text: match[1], type: "bold" },
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), type: "text" });
  return parts;
}

/**
 * Subconjunto de Markdown que os modelos costumam devolver: parágrafos, listas, negrito e
 * código. Tudo vira dados, nunca HTML, então o texto do modelo não injeta marcação na tela.
 */
export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { items: Inline[][]; ordered: boolean } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ inline: parseInline(paragraph.join("\n")), type: "paragraph" });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ ...list, type: "list" });
      list = null;
    }
  };

  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const item = listItem.exec(line);
    if (item) {
      flushParagraph();
      const ordered = item[2] !== undefined;
      if (list && list.ordered !== ordered) flushList();
      list ??= { items: [], ordered };
      list.items.push(parseInline(item[3] ?? ""));
      continue;
    }

    flushList();
    const title = heading.exec(line);
    if (title) {
      flushParagraph();
      blocks.push({ inline: [{ text: title[1] ?? "", type: "bold" }], type: "paragraph" });
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

/** Texto puro, sem marcação: é o que o botão de copiar entrega. */
export function plainText(source: string) {
  return source
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .trim();
}
