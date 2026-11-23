import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

import { isQuotaError } from "./errors";

type ProviderName = "google" | "groq";
type ProviderModel = LanguageModelV4;

export type AssistantModelEnvironment = {
  AGENT_FALLBACK_MODEL?: string;
  AGENT_MODEL?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  GROQ_API_KEY?: string;
};

/** Único ponto de escolha do modelo: trocar de provider é mudar uma linha aqui. */
export const assistantModels = {
  fallback: { id: "openai/gpt-oss-120b", provider: "groq" },
  primary: { id: "gemini-flash-lite-latest", provider: "google" },
} as const satisfies Record<string, { id: string; provider: ProviderName }>;

function providerKey(provider: ProviderName, environment: AssistantModelEnvironment) {
  return provider === "google"
    ? environment.GOOGLE_GENERATIVE_AI_API_KEY
    : environment.GROQ_API_KEY;
}

function buildModel(provider: ProviderName, id: string, apiKey: string): ProviderModel {
  return provider === "google"
    ? createGoogleGenerativeAI({ apiKey })(id)
    : createGroq({ apiKey })(id);
}

export type ResolvedModel = {
  /** Modelo que respondeu por último; muda quando o fallback entra. */
  label: () => string;
  model: ProviderModel;
};

/** Em erro de cota do principal, repete a mesma chamada no fallback, se houver chave. */
export function withQuotaFallback(
  primary: { id: string; model: ProviderModel },
  fallback: { id: string; model: ProviderModel } | null,
): ResolvedModel {
  let active = primary.id;
  if (!fallback) return { label: () => active, model: primary.model };

  const model = wrapLanguageModel({
    middleware: {
      specificationVersion: "v4",
      wrapGenerate: async ({ doGenerate, params }) => {
        try {
          return await doGenerate();
        } catch (error) {
          if (!isQuotaError(error)) throw error;
          active = fallback.id;
          return fallback.model.doGenerate(params);
        }
      },
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (error) {
          if (!isQuotaError(error)) throw error;
          active = fallback.id;
          return fallback.model.doStream(params);
        }
      },
    },
    model: primary.model,
  });
  return { label: () => active, model };
}

export function resolveAssistantModel(environment: AssistantModelEnvironment) {
  const { fallback, primary } = assistantModels;
  const primaryKey = providerKey(primary.provider, environment);
  const fallbackKey = providerKey(fallback.provider, environment);
  const fallbackId = environment.AGENT_FALLBACK_MODEL ?? fallback.id;
  const fallbackModel = fallbackKey
    ? { id: fallbackId, model: buildModel(fallback.provider, fallbackId, fallbackKey) }
    : null;

  if (!primaryKey) {
    return fallbackModel ? withQuotaFallback(fallbackModel, null) : null;
  }
  const primaryId = environment.AGENT_MODEL ?? primary.id;
  return withQuotaFallback(
    { id: primaryId, model: buildModel(primary.provider, primaryId, primaryKey) },
    fallbackModel,
  );
}
