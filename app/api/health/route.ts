import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, isRedisAvailable } from "@/lib/redis";
import { s3 } from "@/lib/s3";
import { env } from "@/lib/env";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

export async function GET() {
  const checks = {
    database: "offline",
    redis: "offline",
    storage: "offline",
    ollama: "offline",
  };

  // 1. Check PostgreSQL database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "offline";
  }

  // 2. Check Redis
  try {
    if (isRedisAvailable) {
      const ping = await redis.ping();
      checks.redis = ping === "PONG" ? "ok" : "degraded";
    } else {
      checks.redis = "fallback (memory)";
    }
  } catch {
    checks.redis = "fallback (memory)";
  }

  // 3. Check S3 / MinIO storage
  try {
    await s3.send(new ListBucketsCommand({}));
    checks.storage = "ok";
  } catch {
    checks.storage = "fallback (local disk)";
  }

  // 4. Check Ollama
  try {
    const ollamaUrl = env.OLLAMA_BASE_URL.replace(/\/v1\/?$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    checks.ollama = response.ok ? "ok" : "degraded";
  } catch {
    checks.ollama = "offline";
  }

  const overallStatus =
    checks.database === "ok" ? "healthy" : "database-offline";

  return NextResponse.json({
    status: overallStatus,
    checks,
    activeModel: env.LOCAL_MODEL_NAME,
    timestamp: new Date().toISOString(),
  });
}
