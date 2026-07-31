import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const statusCommand = isWindows ? process.env.ComSpec : "npx";
const statusArguments = isWindows
  ? ["/d", "/s", "/c", "npx supabase status -o json"]
  : ["supabase", "status", "-o", "json"];
const statusResult = spawnSync(statusCommand, statusArguments, {
  encoding: "utf8",
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});

let localStatus;

try {
  localStatus = JSON.parse(statusResult.stdout);
} catch {
  console.error("Supabase local indisponível. Execute `npm run supabase:start` antes deste gate.");
  process.exit(1);
}

if (!localStatus.API_URL || !localStatus.PUBLISHABLE_KEY) {
  console.error("O Supabase local não forneceu o contrato público necessário ao E2E.");
  process.exit(1);
}

const testCommand = isWindows ? process.env.ComSpec : "npm";
const testArguments = isWindows ? ["/d", "/s", "/c", "npm run test:e2e"] : ["run", "test:e2e"];
const testResult = spawnSync(testCommand, testArguments, {
  env: {
    ...process.env,
    AUTH_E2E_ENABLED: "true",
    MAILPIT_URL: localStatus.MAILPIT_URL ?? "http://127.0.0.1:54324",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localStatus.PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: localStatus.API_URL,
    PLAYWRIGHT_REUSE_SERVER: "false",
  },
  shell: false,
  stdio: "inherit",
});

process.exit(testResult.status ?? 1);
