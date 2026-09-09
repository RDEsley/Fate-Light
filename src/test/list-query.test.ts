import { describe, expect, it } from "vitest";

import {
  appendIdInFilter,
  escapeIlikePattern,
  idsMatchingText,
  textSearchOrFilter,
} from "@/features/search/list-query";

describe("list search helpers", () => {
  it("escapa metacaracteres do ILIKE", () => {
    expect(escapeIlikePattern("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });

  it("monta filtro or textual", () => {
    expect(textSearchOrFilter(["domain", "notes"], "Acme")).toBe(
      "domain.ilike.%Acme%,notes.ilike.%Acme%",
    );
  });

  it("anexa ids relacionados sem poluir quando vazio", () => {
    const parts = ["domain.ilike.%x%"];
    appendIdInFilter(parts, "client_id", []);
    expect(parts).toEqual(["domain.ilike.%x%"]);
    appendIdInFilter(parts, "client_id", ["a", "b"]);
    expect(parts).toContain("client_id.in.(a,b)");
  });

  it("localiza ids por campos visíveis", () => {
    const ids = idsMatchingText(
      [
        { id: "1", name: "Richard", trade_name: null },
        { id: "2", name: "Maria", trade_name: "DX" },
      ],
      "dx",
      ["name", "trade_name"],
    );
    expect(ids).toEqual(["2"]);
  });
});
