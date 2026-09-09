import { render, screen } from "@testing-library/react";

vi.mock("../app/(auth)/actions", () => ({
  authenticateWithPassword: vi.fn(),
  requestMagicLink: vi.fn(),
}));

import { MagicLinkForm } from "@/app/(auth)/_components/magic-link-form";
import { PasswordForm } from "@/app/(auth)/_components/password-form";
import LoginPage from "@/app/login/page";
import SignUpPage from "@/app/cadastro/page";

describe("associação rótulo-campo nos formulários de autenticação", () => {
  it("magic link (cadastro): implementação permanece disponível fora da UX pública", () => {
    render(<MagicLinkForm mode="signup" />);

    expect(screen.getByLabelText("Nome ou nome da empresa")).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toBeVisible();
  });

  it("magic link (login): omite o campo de nome, mantém o e-mail alcançável", () => {
    render(<MagicLinkForm mode="login" />);

    expect(screen.queryByLabelText("Nome ou nome da empresa")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeVisible();
  });

  it("senha (cadastro): todos os quatro campos são alcançáveis pelo rótulo", () => {
    render(<PasswordForm mode="signup" nextPath="/onboarding" />);

    expect(screen.getByLabelText("Nome ou nome da empresa")).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toBeVisible();
    expect(screen.getByLabelText("Senha", { exact: true })).toBeVisible();
    expect(screen.getByLabelText("Confirmar senha")).toBeVisible();
  });

  it("senha (login): omite nome e confirmação, mantém e-mail, senha e recuperação", () => {
    render(<PasswordForm mode="login" nextPath="/dashboard" />);

    expect(screen.queryByLabelText("Nome ou nome da empresa")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirmar senha")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeVisible();
    expect(screen.getByLabelText("Senha", { exact: true })).toBeVisible();
    expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /magic link/i })).not.toBeInTheDocument();
  });

  it("senha (cadastro): não oferece CTA público de magic link", () => {
    render(<PasswordForm mode="signup" nextPath="/onboarding" />);
    expect(screen.queryByRole("link", { name: /magic link/i })).not.toBeInTheDocument();
  });
});

describe("páginas públicas de autenticação", () => {
  it("login ignora method=magic-link e mostra formulário por senha", async () => {
    const ui = await LoginPage({
      searchParams: Promise.resolve({ method: "magic-link", next: "/dashboard" }),
    });
    render(ui);

    expect(screen.getByLabelText("Senha", { exact: true })).toBeVisible();
    expect(screen.queryByRole("button", { name: /receber link de acesso/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /entrar com magic link/i })).not.toBeInTheDocument();
  });

  it("cadastro ignora method=magic-link e mostra formulário por senha", async () => {
    const ui = await SignUpPage({
      searchParams: Promise.resolve({ method: "magic-link" }),
    });
    render(ui);

    expect(screen.getByLabelText("Senha", { exact: true })).toBeVisible();
    expect(screen.getByLabelText("Confirmar senha")).toBeVisible();
    expect(screen.queryByRole("link", { name: /criar conta com magic link/i })).not.toBeInTheDocument();
  });
});
