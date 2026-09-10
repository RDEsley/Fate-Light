import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingWaterCursor } from "@/components/landing-water-cursor";

type FakeContext = {
  arc: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  fillStyle: string;
  lineWidth: number;
  strokeStyle: string;
};

function createContext(): FakeContext {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    lineWidth: 0,
    strokeStyle: "",
  };
}

describe("LandingWaterCursor", () => {
  const originalMatchMedia = window.matchMedia;
  const listeners = new Map<string, EventListener>();
  let context: FakeContext;
  let frameCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    context = createContext();
    frameCallbacks = [];
    document.documentElement.dataset.systemMotion = "";

    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => context),
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      listeners.set(type, listener as EventListener);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation((type) => {
      listeners.delete(type);
    });
    vi.spyOn(document, "addEventListener").mockImplementation((type, listener) => {
      listeners.set(`document:${type}`, listener as EventListener);
    });
    vi.spyOn(document, "removeEventListener").mockImplementation((type) => {
      listeners.delete(`document:${type}`);
    });

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete document.documentElement.dataset.systemMotion;
    vi.restoreAllMocks();
    listeners.clear();
  });

  it("monta o canvas e desenha ondulações após o movimento do ponteiro", () => {
    const { container, unmount } = render(<LandingWaterCursor />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();

    act(() => {
      frameCallbacks[0]?.(0);
    });

    const move = listeners.get("pointermove");
    expect(move).toBeTypeOf("function");

    act(() => {
      move?.(
        new PointerEvent("pointermove", {
          clientX: 120,
          clientY: 80,
        }),
      );
      move?.(
        new PointerEvent("pointermove", {
          clientX: 160,
          clientY: 110,
        }),
      );
      frameCallbacks.at(-1)?.(16);
      frameCallbacks.at(-1)?.(32);
    });

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();

    act(() => {
      listeners.get("pointerleave")?.(new Event("pointerleave"));
      listeners.get("resize")?.(new Event("resize"));
    });

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("não gera ondulações com prefers-reduced-motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    render(<LandingWaterCursor />);
    const move = listeners.get("pointermove");

    act(() => {
      move?.(
        new PointerEvent("pointermove", {
          clientX: 40,
          clientY: 40,
        }),
      );
      frameCallbacks[0]?.(0);
    });

    expect(context.stroke).not.toHaveBeenCalled();
  });

  it("não gera ondulações quando a motion do sistema está desligada", () => {
    document.documentElement.dataset.systemMotion = "off";
    render(<LandingWaterCursor />);
    const move = listeners.get("pointermove");

    act(() => {
      move?.(
        new PointerEvent("pointermove", {
          clientX: 90,
          clientY: 50,
        }),
      );
      frameCallbacks[0]?.(0);
    });

    expect(context.stroke).not.toHaveBeenCalled();
  });

  it("sai cedo quando o canvas não oferece contexto 2d", () => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => null),
    });

    render(<LandingWaterCursor />);
    expect(window.addEventListener).not.toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
      expect.anything(),
    );
  });
});
