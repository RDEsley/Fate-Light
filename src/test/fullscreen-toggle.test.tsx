import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FullscreenToggle } from "@/app/_components/fullscreen-toggle";

describe("FullscreenToggle", () => {
  const requestFullscreen = vi.fn(async () => undefined);
  const exitFullscreen = vi.fn(async () => undefined);

  beforeEach(() => {
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
      writable: true,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreen,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("entra e sai da tela cheia", async () => {
    const user = userEvent.setup();
    render(<FullscreenToggle />);

    await user.click(screen.getByRole("button", { name: /expandir para tela cheia/i }));
    expect(requestFullscreen).toHaveBeenCalled();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.documentElement,
    });
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(await screen.findByRole("button", { name: /sair da tela cheia/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /sair da tela cheia/i }));
    expect(exitFullscreen).toHaveBeenCalled();
  });
});
