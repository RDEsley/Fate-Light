import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/app/clientes/actions", () => ({
  setClientStatus: vi.fn(async () => {}),
}));

import { setClientStatus } from "@/app/clientes/actions";
import { ClientStatusSwitcher } from "@/app/clientes/[clientId]/status-switcher";

const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("client status switcher", () => {
  it("envia o status recém-selecionado, não o anterior", async () => {
    const user = userEvent.setup();
    render(<ClientStatusSwitcher clientId={clientId} status="active" />);

    await user.click(screen.getByRole("combobox", { name: "Situação comercial" }));
    await user.click(screen.getByRole("option", { name: /^Inativo/ }));

    expect(setClientStatus).toHaveBeenCalledTimes(1);
    const submitted = vi.mocked(setClientStatus).mock.calls[0][0] as FormData;
    expect(submitted.get("clientStatus")).toBe("inactive");
    expect(submitted.get("clientId")).toBe(clientId);
  });
});
