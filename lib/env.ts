import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default("us-east-1"),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET_NAME: z.string().default("devscribe-files"),
    AUTH_SECRET: z.string().min(32),
    AUTH_URL: z.string().url().optional(),
    ENCRYPTION_KEY: z.string().length(64),
    OLLAMA_BASE_URL: z.string().url().default("http://host.docker.internal:11434/v1"),
    LOCAL_MODEL_NAME: z.string().default("qwen3:4b"),
    LOCAL_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    LOCAL_MODEL_NAME: process.env.LOCAL_MODEL_NAME,
    LOCAL_EMBEDDING_MODEL: process.env.LOCAL_EMBEDDING_MODEL,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
