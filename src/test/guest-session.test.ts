import { NextRequest, NextResponse } from "next/server";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authenticated: false,
  claims: vi.fn(),
  cookieStore: {
    delete: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  destination: vi.fn(),
  from: vi.fn(),
  headers: new Map<string, string>(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
  headers: vi.fn(async () => ({
    get: (name: string) => mocks.headers.get(name) ?? null,
    has: (name: string) => mocks.headers.has(name),
  })),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  // Fora do servidor o `cache` não existe; aqui basta chamar a função a cada vez.
  cache: <Callback>(callback: Callback) => callback,
}));
vi.mock("@/lib/auth/account-gate", () => ({ getAccountDestination: mocks.destination }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getClaims: mocks.claims },
    from: mocks.from,
  })),
}));
vi.mock("@/lib/supabase/proxy", () => ({
  updateSupabaseSession: vi.fn(async (request: NextRequest) => ({
    authenticated: mocks.authenticated,
    response: NextResponse.next({ request }),
  })),
}));
vi.mock("@/config/env/public", () => ({
  publicEnvironment: {
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile",
  },
}));

import { enterGuestMode, leaveGuestMode } from "@/app/(auth)/guest-actions";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { guestReadOnlyCode } from "@/lib/demo/client";
import { demoWorkspaceId } from "@/lib/demo/dataset";
import { guestCookieName } from "@/lib/demo/guest";
import { proxy } from "@/proxy";

const guestCookie = `${guestCookieName}=1`;

function asGuest(guest = true) {
  mocks.cookieStore.get.mockImplementation((name: string) =>
    guest && name === guestCookieName ? { name, value: "1" } : undefined,
  );
}

function realAccount() {
  const query = {
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single
    .mockResolvedValueOnce({ data: { full_name: "Pessoa Real" }, error: null })
    .mockResolvedValueOnce({
      data: {
        workspace_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        workspaces: { name: "Empresa Real", timezone: "America/Sao_Paulo" },
      },
      error: null,
    });
  mocks.from.mockReturnValue(query);
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null });
  mocks.destination.mockResolvedValue({ kind: "active", path: "/dashboard" });
}

describe("modo visitante — contexto das telas", () => {
  beforeEach(() => {
    mocks.authenticated = false;
    mocks.headers.clear();
    mocks.redirect.mockClear();
    mocks.from.mockReset();
    mocks.destination.mockReset();
    mocks.claims.mockReset().mockResolvedValue({ data: { claims: {} }, error: null });
    mocks.cookieStore.get.mockReset();
    mocks.cookieStore.set.mockReset();
    mocks.cookieStore.delete.mockReset();
    asGuest(false);
  });

  it("manda para o login quem não tem sessão nem modo visitante", async () => {
    await expect(requireWorkspaceContext()).rejects.toThrow("REDIRECT:/login");
  });

  it("entrega dados fictícios, em memória, a quem está como visitante", async () => {
    asGuest();
    const context = await requireWorkspaceContext();

    expect(context).toMatchObject({
      fullName: "Visitante",
      guest: true,
      workspaceId: demoWorkspaceId,
      workspaceName: "Estúdio Horizonte",
    });
    // Nada chega ao Supabase: nem perfil, nem vínculo de workspace, nem checagem de conta.
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.destination).not.toHaveBeenCalled();

    const { data: clients } = await context.supabase.from("clients").select("id");
    expect(clients?.length).toBeGreaterThan(0);
    const { error } = await context.supabase
      .from("clients")
      .insert({ kind: "company", name: "Tentativa", workspace_id: demoWorkspaceId });
    expect(error?.code).toBe(guestReadOnlyCode);
  });

  it("recusa toda Server Action do visitante antes de qualquer leitura", async () => {
    asGuest();

    mocks.headers.set("next-action", "abc123");
    await expect(requireWorkspaceContext()).rejects.toThrow("REDIRECT:/login?status=guest");

    // Sem JavaScript a ação chega como um formulário comum, sem o cabeçalho do React.
    mocks.headers.clear();
    mocks.headers.set("content-type", "multipart/form-data; boundary=----form");
    await expect(requireWorkspaceContext()).rejects.toThrow("REDIRECT:/login?status=guest");

    mocks.headers.set("content-type", "application/x-www-form-urlencoded");
    await expect(requireWorkspaceContext()).rejects.toThrow("REDIRECT:/login?status=guest");
  });

  it("dá prioridade à sessão real mesmo com o cookie de visitante presente", async () => {
    asGuest();
    realAccount();
    mocks.headers.set("next-action", "abc123");

    await expect(requireWorkspaceContext()).resolves.toMatchObject({
      fullName: "Pessoa Real",
      guest: false,
      userId: "user-id",
      workspaceName: "Empresa Real",
    });
  });

  it("respeita o estado da conta real antes de liberar as telas", async () => {
    realAccount();
    mocks.destination.mockResolvedValue({ kind: "onboarding", path: "/onboarding" });

    await expect(requireWorkspaceContext()).rejects.toThrow("REDIRECT:/onboarding");
  });
});

describe("modo visitante — entrada e saída", () => {
  it("liga o modo com um cookie que o navegador não lê e leva ao painel", async () => {
    await expect(enterGuestMode()).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      guestCookieName,
      "1",
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );
  });

  it("desliga o modo e devolve a pessoa ao login", async () => {
    await expect(leaveGuestMode()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.cookieStore.delete).toHaveBeenCalledWith(guestCookieName);
  });
});

describe("modo visitante — proxy", () => {
  const request = (path: string, cookie?: string) =>
    new NextRequest(`https://app.example${path}`, cookie ? { headers: { cookie } } : undefined);

  beforeEach(() => {
    mocks.authenticated = false;
  });

  it("deixa o visitante abrir as telas do sistema", async () => {
    for (const path of ["/dashboard", "/cobrancas", "/clientes/novo", "/perfil"]) {
      const response = await proxy(request(path, guestCookie));
      expect(response.status).toBe(200);
    }
  });

  it("continua exigindo login sem o cookie ou com valor inesperado", async () => {
    for (const cookie of [undefined, `${guestCookieName}=0`, `${guestCookieName}=true`]) {
      const response = await proxy(request("/dashboard", cookie));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://app.example/login?next=%2Fdashboard");
    }
  });

  it("não abre o onboarding para o visitante", async () => {
    const response = await proxy(request("/onboarding", guestCookie));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("apaga o cookie de visitante assim que existe sessão real", async () => {
    mocks.authenticated = true;
    const response = await proxy(request("/dashboard", guestCookie));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(
      new RegExp(`^${guestCookieName}=;.*(Max-Age=0|Expires=Thu, 01 Jan 1970)`, "i"),
    );
  });

  it("mantém login e cadastro acessíveis para o visitante criar a conta", async () => {
    for (const path of ["/login", "/cadastro"]) {
      const response = await proxy(request(path, guestCookie));
      expect(response.status).toBe(200);
    }
  });
});
