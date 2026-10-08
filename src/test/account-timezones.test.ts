import { afterEach, vi } from "vitest";

import { defaultTimezone, detectTimezone, timezoneOptions } from "@/features/account/timezones";

describe("account timezones", () => {
  afterEach(() => vi.restoreAllMocks());

  const resolved = (timeZone: string) =>
    vi.spyOn(Intl, "DateTimeFormat").mockReturnValue({
      resolvedOptions: () => ({ timeZone }),
    } as unknown as Intl.DateTimeFormat);

  it("sugere o fuso do navegador quando ele é um dos oferecidos", () => {
    resolved("America/Manaus");
    expect(detectTimezone()).toBe("America/Manaus");
  });

  it("fica com o padrão quando o fuso não está na lista ou não pode ser lido", () => {
    resolved("Europe/Lisbon");
    expect(detectTimezone()).toBeNull();

    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new Error("indisponível");
    });
    expect(detectTimezone()).toBeNull();
    expect(timezoneOptions.map((option) => option.value)).toContain(defaultTimezone);
  });
});
