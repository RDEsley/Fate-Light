import { render, screen } from "@testing-library/react";

import Loading from "@/app/loading";

describe("Loading", () => {
  it("informa o carregamento com um indicador visual não verbal", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent(/carregando dados do workspace/i);
    expect(document.querySelector(".cartoon-loader")).toHaveAttribute("aria-hidden", "true");
  });
});
