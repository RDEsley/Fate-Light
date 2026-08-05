import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { ToastNotification } from "@/components/ui/toast-notification";

describe("toast notification", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("pausa o fechamento durante o hover e retoma depois", () => {
    render(<ToastNotification message="Serviço aplicado" />);
    const toast = screen.getByRole("status");

    act(() => vi.advanceTimersByTime(2_000));
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(8_000));
    expect(toast).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(4_600));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("permite fechar imediatamente", () => {
    render(<ToastNotification message="Revise os campos" tone="error" />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar notificação" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
