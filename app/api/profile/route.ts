import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          documents: true,
          flashcardDecks: true,
          grammarAudits: true,
          codeReviews: true,
          examSessions: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const telemetryStats = await prisma.telemetryLog.aggregate({
    where: { userId: session.user.id },
    _avg: { tokensPerSecond: true, durationMs: true },
    _sum: { promptTokens: true, completionTokens: true },
    _count: { id: true },
  });

  return NextResponse.json({
    user,
    stats: {
      documentsCount: user._count.documents,
      decksCount: user._count.flashcardDecks,
      grammarCount: user._count.grammarAudits,
      codeReviewsCount: user._count.codeReviews,
      examSessionsCount: user._count.examSessions,
      totalAiQueries: telemetryStats._count.id,
      avgTokensPerSecond: Math.round((telemetryStats._avg.tokensPerSecond || 0) * 10) / 10,
      avgDurationMs: Math.round(telemetryStats._avg.durationMs || 0),
      totalTokens: (telemetryStats._sum.promptTokens || 0) + (telemetryStats._sum.completionTokens || 0),
    },
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = profileUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ user: updated });
}
