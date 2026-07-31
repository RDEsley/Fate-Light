import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button onClick={() => onSuccess("verified-token")} type="button">
      Verificar desafio
    </button>
  ),
}));

import { TurnstileField } from "@/app/(auth)/_components/turnstile-field";

describe("TurnstileField", () => {
  it("não carrega o provedor quando a site key não está configurada", () => {
    const { container } = render(<TurnstileField />);
    expect(container).toBeEmptyDOMElement();
  });

  it("encaminha somente o token público produzido pelo desafio", () => {
    const { container } = render(<TurnstileField siteKey="test-site-key" />);
    fireEvent.click(screen.getByRole("button", { name: /verificar desafio/i }));

    expect(container.querySelector('input[name="captchaToken"]')).toHaveValue("verified-token");
  });
});
