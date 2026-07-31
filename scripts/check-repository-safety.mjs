import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const listedFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /^\.env(?:\.|$)/i,
  /^\.mcp(?:\.|$)/i,
  /^(?:private|imports|exports)\//i,
  /^(?:node_modules|\.next|coverage|dist|build)\//i,
  /(?:^|\/)signing_keys\.json$/i,
  /\.(?:xlsx|xls|xlsm|xlsb|ods|csv|pem|key|p12|pfx|jks|keystore|dump|backup)$/i,
];

const forbiddenFiles = listedFiles.filter((file) => {
  const normalizedFile = file.replaceAll("\\", "/");
  if (normalizedFile === ".env.example") {
    return false;
  }
  return forbiddenPaths.some((pattern) => pattern.test(normalizedFile));
});

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsb_secret_[A-Za-z0-9_-]{16,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
];

const filesWithSecrets = [];

for (const file of listedFiles) {
  const absolutePath = path.join(repositoryRoot, file);
  let content;

  try {
    content = readFileSync(absolutePath);
  } catch {
    continue;
  }

  if (content.includes(0)) {
    continue;
  }

  const text = content.toString("utf8");
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    filesWithSecrets.push(file);
  }
}

if (forbiddenFiles.length > 0 || filesWithSecrets.length > 0) {
  if (forbiddenFiles.length > 0) {
    console.error(`Arquivos proibidos detectados: ${forbiddenFiles.join(", ")}`);
  }
  if (filesWithSecrets.length > 0) {
    console.error(`Possíveis segredos detectados em: ${filesWithSecrets.join(", ")}`);
  }
  process.exit(1);
}

console.log(`Verificação de segurança aprovada para ${listedFiles.length} arquivos.`);
