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

function normalizeGeneratedTypes(output) {
  return output.replace(
    /  \/\/ Allows to automatically instantiate createClient[\s\S]*?  __InternalSupabase: \{\r?\n    PostgrestVersion: "[^"]+"\r?\n  \}\r?\n/,
    "",
  );
}

const generated = [
  "// Arquivo gerado automaticamente por scripts/generate-database-types.mjs. Não edite manualmente.",
  normalizeGeneratedTypes(generation.stdout).trim(),
  "",
].join("\n");

function reportMismatch(current, expected) {
  const currentLines = current.split("\n");
  const expectedLines = expected.split("\n");
  const sharedLength = Math.min(currentLines.length, expectedLines.length);
  let firstDifference = 0;

  while (
    firstDifference < sharedLength &&
    currentLines[firstDifference] === expectedLines[firstDifference]
  ) {
    firstDifference += 1;
  }

  const contextStart = Math.max(0, firstDifference - 2);
  const contextEnd = firstDifference + 8;
  const formatLines = (lines) =>
    lines
      .slice(contextStart, contextEnd)
      .map((line, index) => `${contextStart + index + 1}: ${line}`)
      .join("\n");

  process.stderr.write(
    [
      `Primeira diferença na linha ${firstDifference + 1}.`,
      "--- versão commitada",
      formatLines(currentLines),
      "--- versão gerada",
      formatLines(expectedLines),
      "",
    ].join("\n"),
  );
}

if (checkOnly) {
  const current = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";

  if (current !== generated) {
    reportMismatch(current, generated);
    process.stderr.write("Os tipos do banco estão desatualizados. Execute `npm run db:types`.\n");
    process.exit(1);
  }

  process.stdout.write("Tipos do banco estão atualizados.\n");
  process.exit(0);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, generated, "utf8");
process.stdout.write("Tipos gerados em src/types/database.generated.ts.\n");
