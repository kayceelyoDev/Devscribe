import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

const settingsUpdateSchema = z.object({
  activeProvider: z.enum(["local", "gemini"]).optional(),
  ollamaBaseUrl: z.string().url().optional(),
  localModelName: z.string().min(1).optional(),
  localEmbeddingModel: z.string().min(1).optional(),
  geminiApiKey: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxChunkTokens: z.number().int().min(200).max(4000).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId: session.user.id },
    });
  }

  return NextResponse.json({
    activeProvider: settings.activeProvider,
    ollamaBaseUrl: settings.ollamaBaseUrl,
    localModelName: settings.localModelName,
    localEmbeddingModel: settings.localEmbeddingModel,
    hasGeminiKey: !!settings.encryptedGeminiKey,
    temperature: settings.temperature,
    maxChunkTokens: settings.maxChunkTokens,
    theme: settings.theme,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = settingsUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dataToUpdate: any = {};
  if (parsed.data.activeProvider) dataToUpdate.activeProvider = parsed.data.activeProvider;
  if (parsed.data.ollamaBaseUrl) dataToUpdate.ollamaBaseUrl = parsed.data.ollamaBaseUrl;
  if (parsed.data.localModelName) dataToUpdate.localModelName = parsed.data.localModelName;
  if (parsed.data.localEmbeddingModel) dataToUpdate.localEmbeddingModel = parsed.data.localEmbeddingModel;
  if (parsed.data.temperature !== undefined) dataToUpdate.temperature = parsed.data.temperature;
  if (parsed.data.maxChunkTokens !== undefined) dataToUpdate.maxChunkTokens = parsed.data.maxChunkTokens;
  if (parsed.data.theme) dataToUpdate.theme = parsed.data.theme;

  if (parsed.data.geminiApiKey) {
    // Encrypt with AES-256-GCM before saving at rest
    dataToUpdate.encryptedGeminiKey = encryptSecret(parsed.data.geminiApiKey);
  }

  const updated = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: dataToUpdate,
    create: {
      userId: session.user.id,
      ...dataToUpdate,
    },
  });

  return NextResponse.json({
    success: true,
    settings: {
      activeProvider: updated.activeProvider,
      ollamaBaseUrl: updated.ollamaBaseUrl,
      localModelName: updated.localModelName,
      localEmbeddingModel: updated.localEmbeddingModel,
      hasGeminiKey: !!updated.encryptedGeminiKey,
      temperature: updated.temperature,
      theme: updated.theme,
    },
  });
}
