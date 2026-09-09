import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DisclosureAutoScroll } from "@/components/ui/disclosure-auto-scroll";
import { ClientCombobox } from "@/components/ui/form-controls";

describe("DisclosureAutoScroll", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rola o details aberto para a viewport quando o conteúdo extrapola", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <>
        <DisclosureAutoScroll />
        <details className="form-disclosure">
          <summary>Abrir formulário</summary>
          <p>Conteúdo expandido</p>
        </details>
      </>,
    );

    const details = screen.getByText("Abrir formulário").closest("details")!;
    vi.spyOn(details, "getBoundingClientRect").mockReturnValue({
      top: 40,
      bottom: window.innerHeight + 120,
      left: 0,
      right: 300,
      width: 300,
      height: window.innerHeight + 80,
      x: 0,
      y: 40,
      toJSON: () => ({}),
    });

    await user.click(screen.getByText("Abrir formulário"));
    await vi.waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
  });
});

describe("ClientCombobox stacking", () => {
  it("marca aria-expanded no combobox aberto para o CSS elevar o z-index", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <ClientCombobox
          clients={[{ id: "a", name: "Ana", status: "active", tradeName: null }]}
          label="Cliente de destino"
        />
        <ClientCombobox
          clients={[{ id: "b", name: "Bruno", status: "active", tradeName: null }]}
          label="Cliente de origem"
        />
      </form>,
    );

    const destination = screen.getByRole("combobox", { name: "Cliente de destino" });
    expect(destination).toHaveAttribute("aria-expanded", "false");
    await user.click(destination);
    expect(destination).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("combobox", { name: "Cliente de origem" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
