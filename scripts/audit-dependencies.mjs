import { execSync } from "node:child_process";

/**
 * Avisos aceitos de forma explícita, cada um com o motivo. A lista existe para o gate
 * continuar barrando qualquer aviso alto ou crítico novo sem ficar vermelho para sempre
 * por um que não tem correção publicada. Remova a entrada assim que houver versão corrigida.
 */
const acceptedAdvisories = new Map([
  [
    "GHSA-vfj7-8cjw-p6xm",
    "braces <=3.0.3 sem versão corrigida; chega só por @next/eslint-plugin-next (lint), fora do app em produção.",
  ],
]);

const blockingSeverities = new Set(["critical", "high"]);

function readAudit() {
  try {
    return execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  } catch (error) {
    // `npm audit` sai com código diferente de zero quando encontra avisos; o JSON vem no stdout.
    if (typeof error.stdout === "string" && error.stdout.trim()) return error.stdout;
    throw error;
  }
}

function advisoryId(url) {
  return String(url ?? "").split("/").pop() ?? "";
}

const report = JSON.parse(readAudit());
const blocking = new Map();
const accepted = new Set();

for (const entry of Object.values(report.vulnerabilities ?? {})) {
  for (const cause of entry.via ?? []) {
    // Entradas em texto apenas apontam para outro pacote; o aviso real aparece nele.
    if (typeof cause === "string" || !blockingSeverities.has(cause.severity)) continue;
    const id = advisoryId(cause.url);
    if (acceptedAdvisories.has(id)) accepted.add(id);
    else blocking.set(id, `${cause.name} (${cause.severity}): ${cause.title}`);
  }
}

for (const id of accepted) console.log(`Aceito ${id}: ${acceptedAdvisories.get(id)}`);
for (const id of acceptedAdvisories.keys()) {
  if (!accepted.has(id)) console.log(`${id} não aparece mais na auditoria: remova a exceção.`);
}

if (blocking.size) {
  console.error("Avisos altos ou críticos sem exceção registrada:");
  for (const [id, text] of blocking) console.error(`- ${id} ${text}`);
  process.exit(1);
}

console.log("Auditoria de dependências aprovada.");
