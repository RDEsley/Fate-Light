import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/app/perfil/actions", () => ({
  updateAlertPreferences: vi.fn(),
}));

import { AlertPreferences } from "@/app/perfil/alert-preferences";

describe("AlertPreferences", () => {
  it("organiza as antecedências da menor para a maior", () => {
    render(<AlertPreferences offsets={[30, 7, 1]} />);

    expect(
      screen
        .getAllByRole("checkbox")
        .map((option) => option.getAttribute("value")),
    ).toEqual(["0", "1", "3", "7", "15", "30", "60"]);
  });
});
