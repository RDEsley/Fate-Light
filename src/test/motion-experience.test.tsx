import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import {
  applyMotionPreferences,
  MotionExperience,
  motionPreferenceKeys,
  pointerMarkDuration,
} from "@/components/motion-experience";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches }));
}

describe("motion experience", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.mouseMotion;
    delete document.documentElement.dataset.systemMotion;
    mockReducedMotion(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("aplica separadamente as preferências salvas", () => {
    window.localStorage.setItem(motionPreferenceKeys.mouse, "off");
    window.localStorage.setItem(motionPreferenceKeys.system, "on");

    applyMotionPreferences();

    expect(document.documentElement.dataset.mouseMotion).toBe("off");
    expect(document.documentElement.dataset.systemMotion).toBe("on");
  });

  it("prioriza a preferência de movimento reduzido do dispositivo", () => {
    mockReducedMotion(true);

    applyMotionPreferences();

    expect(document.documentElement.dataset.mouseMotion).toBe("off");
    expect(document.documentElement.dataset.systemMotion).toBe("off");
  });

  it("cria e remove a onda do clique", () => {
    const { container } = render(<MotionExperience />);

    fireEvent.pointerDown(window, { clientX: 40, clientY: 50, pointerType: "mouse" });
    expect(container.querySelectorAll(".pointer-click-pop")).toHaveLength(1);
    expect(container.querySelector(".pointer-click-pop__bubble")).toBeInTheDocument();
    expect(container.querySelector(".pointer-click-pop__wake")).toBeInTheDocument();
    expect(container.querySelector(".pointer-click-pop__dot")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(pointerMarkDuration));
    expect(container.querySelectorAll(".pointer-click-pop")).toHaveLength(0);
  });

  it("posiciona a onda no ponto exato do clique", () => {
    const { container } = render(<MotionExperience />);

    fireEvent.pointerDown(window, { clientX: 128, clientY: 64, pointerType: "mouse" });

    expect(container.querySelector(".pointer-effects g")).toHaveAttribute(
      "transform",
      "translate(128 64)",
    );
  });

  it("não cria rastro e ignora toque ou clique quando a preferência está desligada", () => {
    const { container } = render(<MotionExperience />);

    fireEvent.pointerMove(window, { clientX: 10, clientY: 10, pointerType: "touch" });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 20, pointerType: "mouse" });
    expect(container.querySelectorAll(".pointer-effects g")).toHaveLength(0);

    fireEvent.pointerDown(window, { clientX: 10, clientY: 10, pointerType: "touch" });
    expect(container.querySelectorAll(".pointer-click-pop")).toHaveLength(0);

    window.localStorage.setItem(motionPreferenceKeys.mouse, "off");
    window.dispatchEvent(new Event("fate-light:motion-change"));
    fireEvent.pointerDown(window, { clientX: 30, clientY: 30, pointerType: "mouse" });
    expect(container.querySelectorAll(".pointer-click-pop")).toHaveLength(0);
  });
});
