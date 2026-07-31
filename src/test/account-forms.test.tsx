import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

const accountFormMocks = vi.hoisted(() => ({ setTheme: vi.fn() }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: accountFormMocks.setTheme }),
}));
vi.mock("@/app/onboarding/actions", () => ({
  bootstrapAccount: vi.fn(async (state: unknown) => state),
}));
vi.mock("@/app/perfil/actions", () => ({
  updateProfile: vi.fn(async (state: unknown) => state),
}));
vi.mock("@/app/configuracoes/empresa/actions", () => ({
  updateWorkspaceConfiguration: vi.fn(async (state: unknown) => state),
}));

import { WorkspaceForm } from "@/app/configuracoes/empresa/workspace-form";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { ProfileForm } from "@/app/perfil/profile-form";
import { AccountTheme } from "@/app/_components/account-theme";

describe("account forms", () => {
  it("exige aceite individual das versões legais no onboarding", () => {
    render(
      <OnboardingForm
        legalDocuments={[
          {
            content_markdown: "Termos fictícios",
            document_type: "terms_of_use",
            id: "10000000-0000-4000-8000-000000000001",
            version: "dev-1",
          },
          {
            content_markdown: "Política fictícia",
            document_type: "privacy_policy",
            id: "10000000-0000-4000-8000-000000000002",
            version: "dev-1",
          },
        ]}
      />,
    );

    const acceptances = screen.getAllByRole("checkbox", { name: /li e aceito/i });
    expect(acceptances).toHaveLength(2);
    acceptances.forEach((acceptance) => expect(acceptance).toBeRequired());
    expect(screen.queryByLabelText(/avatar|foto/i)).not.toBeInTheDocument();
  });

  it("mostra e-mail somente leitura e preferências textuais no perfil", () => {
    render(
      <ProfileForm
        email="pessoa@example.test"
        profile={{
          full_name: "Pessoa Exemplo",
          locale: "pt-BR",
          phone: null,
          theme: "system",
          timezone: "America/Sao_Paulo",
        }}
      />,
    );

    expect(screen.getByDisplayValue("pessoa@example.test")).toBeDisabled();
    expect(screen.getByRole("button", { name: /salvar perfil/i })).toBeVisible();
  });

  it("mantém moeda bloqueada e permite configurar alertas do workspace", () => {
    render(
      <WorkspaceForm
        settings={{
          accounting_basis: "cash",
          address_city: null,
          address_district: null,
          address_line1: null,
          address_line2: null,
          address_region: null,
          country_code: "BR",
          date_format: "DD/MM/YYYY",
          default_alert_offsets: [30, 7],
          legal_name: "Empresa Exemplo LTDA",
          postal_code: null,
          tax_id: null,
          trade_name: null,
        }}
        workspace={{ currency: "BRL", name: "Empresa Exemplo", timezone: "America/Sao_Paulo" }}
      />,
    );

    expect(screen.getByDisplayValue("BRL")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /30 dias/i })).toBeChecked();
    expect(screen.getByRole("button", { name: /salvar configurações/i })).toBeVisible();
  });

  it("aplica a preferência de tema armazenada para a área autenticada", () => {
    render(<AccountTheme theme="dark" />);
    expect(accountFormMocks.setTheme).toHaveBeenCalledWith("dark");
  });
});
