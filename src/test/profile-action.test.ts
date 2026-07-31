import { vi } from "vitest";

const profileMocks = vi.hoisted(() => ({
  claims: vi.fn(),
  eq: vi.fn(),
  revalidatePath: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: profileMocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getClaims: profileMocks.claims },
    from: vi.fn(() => ({ update: profileMocks.update })),
  })),
}));

import { updateProfile } from "@/app/perfil/actions";
import { initialActionState } from "@/lib/forms/action-state";

function profileForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    fullName: "Pessoa Atualizada",
    locale: "pt-BR",
    phone: "11999999999",
    theme: "dark",
    timezone: "America/Sao_Paulo",
    ...overrides,
  };
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("profile action", () => {
  beforeEach(() => {
    profileMocks.claims.mockReset();
    profileMocks.claims.mockResolvedValue({
      data: { claims: { sub: "verified-user-id" } },
      error: null,
    });
    profileMocks.eq.mockReset();
    profileMocks.eq.mockReturnValue({ select: profileMocks.select });
    profileMocks.select.mockReset();
    profileMocks.select.mockReturnValue({ single: profileMocks.single });
    profileMocks.single.mockReset();
    profileMocks.single.mockResolvedValue({ data: { id: "verified-user-id" }, error: null });
    profileMocks.update.mockReset();
    profileMocks.update.mockReturnValue({ eq: profileMocks.eq });
    profileMocks.revalidatePath.mockClear();
  });

  it("atualiza somente campos concedidos e deriva o id das claims", async () => {
    await expect(updateProfile(initialActionState, profileForm())).resolves.toMatchObject({
      status: "success",
      theme: "dark",
    });

    expect(profileMocks.update).toHaveBeenCalledWith({
      full_name: "Pessoa Atualizada",
      locale: "pt-BR",
      phone: "11999999999",
      theme: "dark",
      timezone: "America/Sao_Paulo",
    });
    expect(profileMocks.eq).toHaveBeenCalledWith("id", "verified-user-id");
  });

  it("não tenta escrever quando a sessão não é verificável", async () => {
    profileMocks.claims.mockResolvedValue({ data: { claims: {} }, error: null });

    expect(await updateProfile(initialActionState, profileForm())).toMatchObject({
      status: "error",
    });
    expect(profileMocks.update).not.toHaveBeenCalled();
  });
});
