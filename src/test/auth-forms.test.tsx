import { render, screen } from "@testing-library/react";

vi.mock("../app/(auth)/actions", () => ({
  authenticateWithPassword: vi.fn(),
  requestMagicLink: vi.fn(),
}));

import { MagicLinkForm } from "@/app/(auth)/_components/magic-link-form";
import { PasswordForm } from "@/app/(auth)/_components/password-form";

/**
 * A troca da classe `text-sm font-semibold` por `field`/`field__label` já derrubou uma
 * vez a associação rótulo-campo em `password-form.tsx` (label e input viraram irmãos
 * dentro de uma div, sem `htmlFor`/nesting). `getByLabelText` só encontra o campo quando
 * a associação é real, então este teste é o que teria pego o erro.
 *
 * Em `password-form.tsx` a dica ("Usaremos esse nome...", "Use pelo menos 8
 * caracteres.") mora dentro do próprio `<label>` implícito — mesmo padrão pré-existente
 * de `client-form.tsx`/`service-catalog-form.tsx` — então o nome acessível do campo
 * inclui o texto da dica. Por isso a checagem usa regex ancorado no começo em vez de
 * string exata: continua provando que o campo é alcançável pelo rótulo, sem brigar com
 * essa divergência já registrada em `docs/private/NOTES.md`.
 */
describe("associação rótulo-campo nos formulários de autenticação", () => {
  it("magic link (cadastro): todo campo visível é alcançável pelo rótulo, sem ruído no nome", () => {
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

    expect(screen.getByLabelText(/^Nome ou nome da empresa/)).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toBeVisible();
    expect(screen.getByLabelText(/^Senha/)).toBeVisible();
    expect(screen.getByLabelText("Confirmar senha")).toBeVisible();
  });

  it("senha (login): omite nome e confirmação, mantém e-mail e senha", () => {
    render(<PasswordForm mode="login" nextPath="/dashboard" />);

    expect(screen.queryByLabelText(/^Nome ou nome da empresa/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Confirmar senha")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeVisible();
    expect(screen.getByLabelText(/^Senha/)).toBeVisible();
  });
});
