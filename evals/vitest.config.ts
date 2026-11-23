import { resolve } from "node:path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Configuração separada: a avaliação usa a chave do .env.local e nunca entra em `npm test`.
export default defineConfig({
  resolve: { alias: { "@": resolve(process.cwd(), "src") } },
  test: {
    environment: "node",
    env: loadEnv("development", process.cwd(), ""),
    include: ["evals/assistant.eval.ts"],
    testTimeout: 600_000,
  },
});
