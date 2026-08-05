import { render, screen } from "@testing-library/react";

import { FeedbackBanner } from "@/components/ui/feedback-banner";

describe("feedback banner", () => {
  it.each([
    ["error", "alert", "Não foi possível salvar."],
    ["info", "status", "Confira esta informação."],
    ["success", "status", "Alterações salvas."],
    ["warning", "status", "Revise antes de continuar."],
  ] as const)("renderiza o tom %s com semântica adequada", (tone, role, message) => {
    render(<FeedbackBanner message={message} tone={tone} />);

    expect(screen.getByRole(role)).toHaveTextContent(message);
  });

  it("usa sucesso como tom padrão", () => {
    render(<FeedbackBanner message="Tudo certo." />);

    expect(screen.getByRole("status")).toHaveTextContent("Tudo certo.");
  });
});
