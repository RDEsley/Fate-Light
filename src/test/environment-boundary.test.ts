import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("environment boundary", () => {
  it("não referencia a chave secreta no contrato público ou no cliente Supabase", () => {
    const publicEnvironmentSource = readFileSync(
      join(process.cwd(), "src/config/env/public.ts"),
      "utf8",
    );
    const browserClientSource = readFileSync(
      join(process.cwd(), "src/lib/supabase/client.ts"),
      "utf8",
    );

    expect(publicEnvironmentSource).not.toContain("SUPABASE_SECRET_KEY");
    expect(browserClientSource).not.toContain("SUPABASE_SECRET_KEY");
    expect(browserClientSource).not.toContain("@/config/env/server");
  });

  it("não mantém nomes legados de chaves Supabase no código da aplicação", () => {
    const applicationSources = [
      "src/config/env/public.ts",
      "src/config/env/server.ts",
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8"));

    for (const source of applicationSources) {
      expect(source).not.toMatch(/SUPABASE_(?:ANON|SERVICE_ROLE)_KEY/);
    }
  });
});
