import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("src/types/database.generated.ts");
const checkOnly = process.argv.includes("--check");
const linked = process.argv.includes("--linked");
const cliPath = resolve("node_modules/supabase/dist/supabase.js");

const generation = spawnSync(
  process.execPath,
  [cliPath, "gen", "types", "typescript", linked ? "--linked" : "--local", "--schema", "public"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
  },
);

if (generation.status !== 0) {
  process.stderr.write(generation.stderr || "Falha ao gerar tipos do banco local.\n");
  process.exit(generation.status ?? 1);
}

const generated = [
  "// Arquivo gerado automaticamente por scripts/generate-database-types.mjs. Não edite manualmente.",
  generation.stdout.trim(),
  "",
].join("\n");

if (checkOnly) {
  const current = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";

  if (current !== generated) {
    process.stderr.write("Os tipos do banco estão desatualizados. Execute `npm run db:types`.\n");
    process.exit(1);
  }

  process.stdout.write("Tipos do banco estão atualizados.\n");
  process.exit(0);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, generated, "utf8");
process.stdout.write("Tipos gerados em src/types/database.generated.ts.\n");
