import { vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  createServerClient: vi.fn(),
  cookies: vi.fn(),
  serverClientOptions: undefined as
    | {
        cookies: {
          getAll: () => unknown;
          setAll: (cookies: Array<{ name: string; value: string; options?: object }>) => void;
        };
      }
    | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: supabaseMocks.cookies,
}));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: supabaseMocks.createBrowserClient,
  createServerClient: (...arguments_: unknown[]) => {
    supabaseMocks.serverClientOptions = arguments_[2] as typeof supabaseMocks.serverClientOptions;
    return supabaseMocks.createServerClient(...arguments_);
  },
}));

import { getServerEnvironment } from "@/config/env/server";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

describe("Supabase client factories", () => {
  it("cria o cliente do navegador somente com o contrato público", () => {
    supabaseMocks.createBrowserClient.mockReturnValue({ kind: "browser" });

    expect(createBrowserSupabaseClient()).toEqual({ kind: "browser" });
    expect(supabaseMocks.createBrowserClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  });

  it("adapta leitura e escrita de cookies para o cliente do servidor", async () => {
    const getAll = vi.fn(() => [{ name: "session", value: "test-session" }]);
    const set = vi.fn();
    supabaseMocks.cookies.mockResolvedValue({ getAll, set });
    supabaseMocks.createServerClient.mockReturnValue({ kind: "server" });

    expect(await createServerSupabaseClient()).toEqual({ kind: "server" });

    const cookieAdapter = supabaseMocks.serverClientOptions?.cookies;
    expect(cookieAdapter?.getAll()).toEqual([{ name: "session", value: "test-session" }]);

    cookieAdapter?.setAll([{ name: "session", value: "updated", options: { httpOnly: true } }]);
    expect(set).toHaveBeenCalledWith("session", "updated", { httpOnly: true });
  });

  it("tolera escrita indisponível em Server Components", async () => {
    supabaseMocks.cookies.mockResolvedValue({
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error("cookies are read-only");
      }),
    });

    await createServerSupabaseClient();

    expect(() =>
      supabaseMocks.serverClientOptions?.cookies.setAll([{ name: "session", value: "updated" }]),
    ).not.toThrow();
  });

  it("valida o ambiente de servidor sem exigir uma chave ainda não utilizada", () => {
    expect(getServerEnvironment()).toMatchObject({
      NEXT_PUBLIC_APP_URL: "https://example.invalid",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });
  });
});
