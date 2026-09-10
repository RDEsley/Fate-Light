import { describe, expect, it } from "vitest";

import { buildSupportWhatsAppUrl, supportContact } from "@/lib/support/contact";

describe("support contact", () => {
  it("monta o link do WhatsApp com mensagem pronta", () => {
    const url = new URL(buildSupportWhatsAppUrl());

    expect(url.origin + url.pathname).toBe(`https://wa.me/${supportContact.phoneE164}`);
    expect(url.searchParams.get("text")).toBe(supportContact.whatsappMessage);
  });

  it("permite acrescentar contexto na mensagem", () => {
    const url = new URL(buildSupportWhatsAppUrl("Workspace: Demo"));
    expect(url.searchParams.get("text")).toContain("Workspace: Demo");
  });
});
