import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  guest: vi.fn(),
}));

vi.mock("@/lib/demo/session", () => ({ hasGuestCookie: mocks.guest }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getClaims: mocks.claims } })),
}));
// A animação é decorativa e baixa o player sob demanda; aqui só o link de volta interessa.
vi.mock("@/features/support/donation-art", () => ({ JarArt: () => null, WaveArt: () => null }));

import SupportPage from "@/app/apoiar/page";

describe("link de volta da página de apoio", () => {
  beforeEach(() => {
    mocks.claims.mockReset().mockResolvedValue({ data: { claims: {} }, error: null });
    mocks.guest.mockReset().mockResolvedValue(false);
  });

  it("leva ao painel quem está com a conta aberta", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null });

    render(await SupportPage());

    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Voltar ao início" })).not.toBeInTheDocument();
  });

  it("leva ao painel quem navega como visitante", async () => {
    mocks.guest.mockResolvedValue(true);

    render(await SupportPage());

    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("leva à página inicial quem chegou sem sessão", async () => {
    render(await SupportPage());

    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Voltar ao painel" })).not.toBeInTheDocument();
  });
});
