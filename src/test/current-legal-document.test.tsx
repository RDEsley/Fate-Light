import { render, screen } from "@testing-library/react";

import { CurrentLegalDocument } from "@/features/legal/current-document";

const query = {
  eq: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => query),
  })),
}));

describe("CurrentLegalDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({
      data: {
        content_markdown: "Conteúdo jurídico publicado para o teste.",
        document_type: "terms_of_use",
        effective_at: "2026-08-28T00:00:00.000Z",
        version: "2026.08",
      },
      error: null,
    });
  });

  it("consulta apenas colunas concedidas ao visitante anônimo", async () => {
    render(await CurrentLegalDocument({ type: "terms_of_use" }));

    expect(query.eq).toHaveBeenCalledOnce();
    expect(query.eq).toHaveBeenCalledWith("document_type", "terms_of_use");
    expect(screen.getByRole("heading", { name: "Termos de Uso" })).toBeInTheDocument();
    expect(screen.getByText(/conteúdo jurídico publicado/i)).toBeInTheDocument();
  });
});
