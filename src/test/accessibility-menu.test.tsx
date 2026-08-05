import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { AccessibilityMenu, accessibilityPreferenceKeys } from "@/components/accessibility-menu";
import { motionPreferenceKeys } from "@/components/motion-experience";

describe("accessibility menu", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete document.documentElement.dataset.contrast;
    delete document.documentElement.dataset.linkEmphasis;
    delete document.documentElement.dataset.mouseMotion;
    delete document.documentElement.dataset.systemMotion;
    delete document.documentElement.dataset.textSize;
  });

  it("salva ajustes funcionais e restaura o padrão", () => {
    render(<AccessibilityMenu />);
    act(() => vi.runOnlyPendingTimers());

    fireEvent.click(screen.getByRole("button", { name: /abrir opções/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /texto maior/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /contraste reforçado/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /destacar links/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /efeito de clique/i }));

    expect(window.localStorage.getItem(accessibilityPreferenceKeys.text)).toBe("on");
    expect(window.localStorage.getItem(accessibilityPreferenceKeys.contrast)).toBe("on");
    expect(window.localStorage.getItem(accessibilityPreferenceKeys.links)).toBe("on");
    expect(window.localStorage.getItem(motionPreferenceKeys.mouse)).toBe("off");
    expect(document.documentElement.dataset.textSize).toBe("large");
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(document.documentElement.dataset.linkEmphasis).toBe("on");
    expect(document.documentElement.dataset.mouseMotion).toBe("off");

    fireEvent.click(screen.getByRole("button", { name: /restaurar padrão/i }));
    expect(window.localStorage.getItem(accessibilityPreferenceKeys.text)).toBeNull();
    expect(window.localStorage.getItem(motionPreferenceKeys.mouse)).toBeNull();
    expect(document.documentElement.dataset.textSize).toBe("standard");
    expect(document.documentElement.dataset.mouseMotion).toBe("on");
  });

  it("fecha com Escape", () => {
    render(<AccessibilityMenu />);
    act(() => vi.runOnlyPendingTimers());
    fireEvent.click(screen.getByRole("button", { name: /abrir opções/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
