import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/lib/env";
import { withLocalInferenceLock } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export type ProviderName = "local" | "gemini";
export type TaskType = "grammar" | "code" | "study" | "examiner";

export type ProviderSettings = {
  provider: ProviderName;
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxChunkTokens?: number;
};

export function getTaskTemperature(task: TaskType): number {
  switch (task) {
    case "code":
      return 0.1;
    case "grammar":
      return 0.2;
    case "study":
      return 0.5;
    case "examiner":
      return 0.4;
    default:
      return 0.2;
  }
}

export function resolveProviderSettings(overrides: Partial<ProviderSettings> = {}): ProviderSettings {
  const provider = overrides.provider ?? "local";
  const modelName = overrides.modelName ?? (provider === "gemini" ? "gemini-2.5-flash" : env.LOCAL_MODEL_NAME);
  const baseUrl = overrides.baseUrl ?? env.OLLAMA_BASE_URL;

  return {
    provider,
    modelName,
    baseUrl,
    apiKey: overrides.apiKey ?? env.GOOGLE_GENERATIVE_AI_API_KEY,
    temperature: overrides.temperature ?? getTaskTemperature("study"),
    maxChunkTokens: overrides.maxChunkTokens ?? 1000,
  };
}

export function getModelClient(provider: ProviderName, customKey?: string, customBaseUrl?: string) {
  if (provider === "gemini") {
    const apiKey = customKey || env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Google Gemini API Key is not configured. Please add it in Settings or set GOOGLE_GENERATIVE_AI_API_KEY.");
    }
    return createGoogleGenerativeAI({ apiKey });
  }

  const baseURL = customBaseUrl || env.OLLAMA_BASE_URL;
  return createOpenAI({
    baseURL,
    apiKey: "ollama-local",
  });
}

export function getModelName(provider: ProviderName, fallbackModel?: string) {
  if (provider === "gemini") {
    return "gemini-2.5-flash";
  }
  return fallbackModel ?? env.LOCAL_MODEL_NAME;
}

export async function logTelemetry(data: {
  userId: string;
  provider: ProviderName;
  modelName: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}) {
  try {
    const totalTokens = data.promptTokens + data.completionTokens;
    const tokensPerSecond = data.durationMs > 0 ? (totalTokens / (data.durationMs / 1000)) : 0;

    await prisma.telemetryLog.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        modelName: data.modelName,
        feature: data.feature,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        durationMs: data.durationMs,
        tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
      },
    });
  } catch {
    // Non-blocking telemetry
  }
}

export async function runWithInferenceControl<T>(
  provider: ProviderName,
  operation: () => Promise<T>
): Promise<T> {
  if (provider === "local") {
    // Acquire distributed local hardware lock to prevent Ollama GPU/CPU overload
    return withLocalInferenceLock(operation);
  }
  // Cloud Gemini calls run concurrently without local hardware lock
  return operation();
}
