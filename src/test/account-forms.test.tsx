import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/onboarding/actions", () => ({
  bootstrapAccount: vi.fn(async (state: unknown) => state),
}));
vi.mock("@/app/perfil/actions", () => ({
  changePassword: vi.fn(async (state: unknown) => state),
  updateProfile: vi.fn(async (state: unknown) => state),
}));
vi.mock("@/app/perfil/lifecycle-actions", () => ({
  requestAccountDeletion: vi.fn(async (state: unknown) => state),
  requestDataExport: vi.fn(async (state: unknown) => state),
}));
vi.mock("@/app/configuracoes/empresa/actions", () => ({
  updateWorkspaceConfiguration: vi.fn(async (state: unknown) => state),
}));

import { WorkspaceForm } from "@/app/configuracoes/empresa/workspace-form";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { ProfileForm } from "@/app/perfil/profile-form";
import { LifecycleRequestPanel } from "@/app/perfil/lifecycle-request-panel";
import { MotionSettings } from "@/components/motion-settings";
import { accountDeletionPhrase } from "@/features/account/lifecycle";

describe("account forms", () => {
  it("exige aceite individual das versões legais no onboarding", () => {
    render(
      <OnboardingForm
        initialDisplayName="Empresa Exemplo"
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
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue("Empresa Exemplo");
    expect(screen.getByLabelText(/nome do workspace/i)).toHaveValue("Empresa Exemplo");
  });

  it("mostra e-mail somente leitura e preferências textuais no perfil", () => {
    render(
      <ProfileForm
        email="pessoa@example.test"
        profile={{
          full_name: "Pessoa Exemplo",
          locale: "pt-BR",
          phone: null,
          timezone: "America/Sao_Paulo",
        }}
      />,
    );

    expect(screen.getByDisplayValue("pessoa@example.test")).toBeDisabled();
    expect(screen.getByRole("button", { name: /salvar perfil/i })).toBeVisible();
  });

  it("mantém moeda bloqueada e preserva a antecedência salva dos alertas", () => {
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
    expect(screen.getByRole("button", { name: /salvar configurações/i })).toBeVisible();
    // A escolha da antecedência foi para o perfil; aqui os valores só seguem ocultos
    // para a RPC de configuração, que recebe todos os campos de uma vez.
    expect(screen.queryByRole("checkbox", { name: /30 dias/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('input[type="hidden"][name="alertOffsets"]')).toHaveLength(2);
  });

  it("permite desligar separadamente as animações da experiência", () => {
    render(<MotionSettings />);
    const mouse = screen.getByRole("checkbox", { name: /animações do mouse/i });
    const system = screen.getByRole("checkbox", { name: /animações do sistema/i });
    fireEvent.click(mouse);
    fireEvent.click(system);
    expect(window.localStorage.getItem("fate-light:mouse-motion")).toBe("off");
    expect(window.localStorage.getItem("fate-light:system-motion")).toBe("off");
  });

  it("mostra exportação e exclusão como ações diretas, sem campo de frase na página", () => {
    render(<LifecycleRequestPanel requests={[]} />);

    expect(screen.getByRole("button", { name: /solicitar exportação/i })).toBeVisible();
    expect(screen.getByRole("button", { name: "Excluir conta" })).toBeVisible();
    expect(screen.getByText(/nenhuma solicitação registrada/i)).toBeVisible();
    // A frase só é pedida dentro da confirmação; fora dela a página fica enxuta.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(accountDeletionPhrase)).not.toBeInTheDocument();
  });

  it("libera a exclusão somente após a frase exata e envia o que foi digitado", () => {
    render(<LifecycleRequestPanel requests={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
    const dialog = screen.getByRole("dialog", { name: /excluir minha conta/i });
    expect(dialog).toHaveTextContent(/nada é apagado nem suspenso agora/i);

    const submit = screen.getByRole("button", { name: /solicitar exclusão/i });
    expect(submit).toBeDisabled();

    const field = screen.getByPlaceholderText(accountDeletionPhrase);
    fireEvent.change(field, { target: { value: "excluir" } });
    expect(screen.getByText(/a frase ainda não confere/i)).toBeInTheDocument();
    expect(submit).toBeDisabled();

    fireEvent.change(field, { target: { value: accountDeletionPhrase } });
    expect(submit).toBeEnabled();
    // O servidor confere a frase de verdade: ela viaja no campo oculto do formulário.
    expect(document.querySelector('input[type="hidden"][name="confirmation"]')).toHaveValue(
      accountDeletionPhrase,
    );
  });
});
