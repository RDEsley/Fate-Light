import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { FocusCharge } from "@/app/cobrancas/focus-charge";

const chargeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function mountCharge() {
  const article = document.createElement("article");
  article.id = `charge-${chargeId}`;
  document.body.append(article);
  return article;
}

describe("focus charge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("rola suavemente até a cobrança citada e destaca a borda", () => {
    const article = mountCharge();
    const scrollIntoView = vi.spyOn(article, "scrollIntoView");

    render(<FocusCharge chargeId={chargeId} />);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(article).toHaveAttribute("data-focused", "true");
  });

  it("retira o destaque depois de alguns segundos", () => {
    const article = mountCharge();
    render(<FocusCharge chargeId={chargeId} />);

    act(() => vi.advanceTimersByTime(3200));

    expect(article).not.toHaveAttribute("data-focused");
  });

  it("salta sem animação quando o dispositivo pede movimento reduzido", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const article = mountCharge();
    const scrollIntoView = vi.spyOn(article, "scrollIntoView");

    render(<FocusCharge chargeId={chargeId} />);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });

  it("não faz nada quando o alerta aponta para uma cobrança ausente", () => {
    expect(() =>
      render(<FocusCharge chargeId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" />),
    ).not.toThrow();
    expect(() => render(<FocusCharge />)).not.toThrow();
  });
});
