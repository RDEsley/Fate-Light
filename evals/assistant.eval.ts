/**
 * Avaliação contra o modelo real. Só local: gasta cota e precisa de chave, então nunca roda no CI.
 * Uso: npm run evals
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { generateText, isStepCount } from "ai";
import { expect, it } from "vitest";

import { createAssistantReader, createDemoAssistantWriter } from "../src/features/assistant/data";
import { resolveAssistantModel } from "../src/features/assistant/model";
import { buildSystemPrompt } from "../src/features/assistant/prompt";
import { createAssistantTools, createToolApproval } from "../src/features/assistant/tools";
import { isoDateInTimeZone } from "../src/features/mvp/format";
import { createDemoClient } from "../src/lib/demo/client";
import { buildDemoDataset, demoProfile, demoWorkspaceId } from "../src/lib/demo/dataset";

type EvalCase = {
  args?: Record<string, unknown>;
  question: string;
  then?: string;
  tool: string;
};

const cases: EvalCase[] = JSON.parse(readFileSync(resolve("evals/questions.json"), "utf8"));
const pauseMs = Number(process.env.EVAL_PAUSE_MS ?? 13_000);
const pause = () => new Promise((done) => setTimeout(done, pauseMs));

async function main() {
  const resolved = resolveAssistantModel({
    AGENT_FALLBACK_MODEL: process.env.AGENT_FALLBACK_MODEL,
    AGENT_MODEL: process.env.AGENT_MODEL,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  });
  if (!resolved)
    throw new Error("Defina GOOGLE_GENERATIVE_AI_API_KEY ou GROQ_API_KEY no .env.local.");

  const today = isoDateInTimeZone(demoProfile.timezone);
  const reader = createAssistantReader({
    supabase: createDemoClient(buildDemoDataset(today)),
    today,
    workspaceId: demoWorkspaceId,
  });
  const writer = createDemoAssistantWriter(reader);
  let passed = 0;

  for (const [index, item] of cases.entries()) {
    if (index) await pause();
    let ok = false;
    let detail = "";
    try {
      const result = await generateText({
        experimental_toolApprovalSecret: "eval-only-approval-secret-32-characters",
        maxRetries: 1,
        model: resolved.model,
        prompt: item.question,
        stopWhen: isStepCount(5),
        system: buildSystemPrompt(today),
        toolApproval: createToolApproval(reader, "eval-only-approval-secret-32-characters"),
        tools: createAssistantTools(reader, writer),
      });
      const calls = result.steps.flatMap((step) => step.toolCalls);
      const first = calls.find((call) => call.toolName === item.tool);
      const argsOk = Object.entries(item.args ?? {}).every(
        ([key, value]) => (first?.input as Record<string, unknown> | undefined)?.[key] === value,
      );
      const thenOk = !item.then || calls.some((call) => call.toolName === item.then);
      ok = Boolean(first) && argsOk && thenOk;
      detail = calls.map((call) => `${call.toolName}(${JSON.stringify(call.input)})`).join(" > ");
    } catch (error) {
      detail = error instanceof Error ? error.name : "erro";
    }
    passed += ok ? 1 : 0;
    console.log(`${ok ? "OK  " : "FALHA"} ${item.question}\n      ${detail || "nenhuma tool"}`);
  }

  const rate = Math.round((passed / cases.length) * 100);
  console.log(`\nAcerto: ${passed}/${cases.length} (${rate}%) com ${resolved.label()}`);
  return rate;
}

// Roda pelo Vitest para reaproveitar o alias `@/`; o nome `.eval.ts` fica fora de `npm test`.
it("acerta a tool esperada em pelo menos 80% das perguntas", async () => {
  expect(await main()).toBeGreaterThanOrEqual(80);
}, 600_000);
