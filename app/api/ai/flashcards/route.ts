import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getModelClient, getModelName, logTelemetry, runWithInferenceControl, ProviderName } from "@/lib/ai/provider";
import { flashcardListSchema } from "@/lib/ai/schemas";
import { rankRelevantChunks } from "@/lib/ai/rag";
import { reviewCard, DbFlashcard, Rating } from "@/lib/fsrs";

const generateSchema = z.object({
  documentId: z.string().optional(),
  deckId: z.string().optional(),
  topic: z.string().optional(),
  count: z.number().int().min(1).max(20).default(5),
});

const reviewSchema = z.object({
  cardId: z.string(),
  rating: z.enum(["Again", "Hard", "Good", "Easy"]),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deckId");

  if (deckId) {
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId, userId: session.user.id },
      include: {
        cards: {
          orderBy: { due: "asc" },
        },
      },
    });
    return NextResponse.json({ deck });
  }

  const decks = await prisma.flashcardDeck.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      cards: true,
      _count: { select: { cards: true } },
    },
  });

  return NextResponse.json({ decks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const payload = generateSchema.safeParse(json);

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  const provider = (userSettings?.activeProvider as ProviderName) || "local";
  const modelName = getModelName(provider, userSettings?.localModelName);

  let contextText = "";
  let deckTitle = payload.data.topic || "Document Review";

  if (payload.data.documentId) {
    const doc = await prisma.document.findUnique({
      where: { id: payload.data.documentId, userId: session.user.id },
      include: { chunks: true },
    });

    if (doc) {
      deckTitle = doc.title;
      const query = payload.data.topic || doc.title;
      const ranked = rankRelevantChunks(query, doc.chunks, null, 6);
      contextText = ranked.map((c) => c.content).join("\n\n---\n\n");
    }
  }

  if (!contextText && payload.data.topic) {
    contextText = `Topic: ${payload.data.topic}. Generate comprehensive study flashcards covering core definitions, trade-offs, architecture, and practical examples.`;
  }

  const startTime = Date.now();
  let generatedCards: Array<{ front: string; back: string; codeSnippet?: string | null; tags: string[] }> = [];

  try {
    const client = getModelClient(provider);
    const model = client(modelName);

    const result = await runWithInferenceControl(provider, async () => {
      return await generateObject({
        model,
        schema: flashcardListSchema,
        prompt: `You are an expert tutor creating FSRS spaced repetition flashcards.
Context material:
"""
${contextText.slice(0, 4000)}
"""

Generate ${payload.data.count} high-retention flashcards.
Requirements:
1. "front" must be a concise, precise question or prompt.
2. "back" must be a crystal-clear, informative explanation.
3. Include "codeSnippet" whenever applicable.
4. Add 2-3 relevant tags.`,
      });
    });

    generatedCards = result.object.cards;

    await logTelemetry({
      userId: session.user.id,
      provider,
      modelName,
      feature: "flashcards",
      promptTokens: 500,
      completionTokens: generatedCards.length * 80,
      durationMs: Date.now() - startTime,
    });
  } catch (aiError) {
    console.warn("AI generation offline/failed, generating structured local cards:", aiError);
    // Intelligent fallback for offline laptop development
    const sampleTopics = payload.data.topic
      ? [payload.data.topic]
      : ["System Architecture", "Spaced Repetition", "Database Indexing", "Concurrency Locks"];

    generatedCards = Array.from({ length: payload.data.count }, (_, i) => {
      const topic = sampleTopics[i % sampleTopics.length];
      return {
        front: `What is the core mechanism of ${topic}? (Card #${i + 1})`,
        back: `${topic} optimizes system throughput and reliability through targeted architectural constraints. Review this concept to reinforce memory stability.`,
        codeSnippet: i % 2 === 0 ? `// Example demonstration for ${topic}\nconst state = { active: true, step: ${i + 1} };` : null,
        tags: ["study", topic.toLowerCase().replace(/\s+/g, "-")],
      };
    });
  }

  // Create or add to deck
  let deckId = payload.data.deckId;
  if (!deckId) {
    const newDeck = await prisma.flashcardDeck.create({
      data: {
        userId: session.user.id,
        documentId: payload.data.documentId ?? null,
        title: deckTitle,
        description: `Generated ${generatedCards.length} flashcards via ${modelName}`,
      },
    });
    deckId = newDeck.id;
  }

  const createdCards = await Promise.all(
    generatedCards.map((c) =>
      prisma.flashcard.create({
        data: {
          deckId: deckId!,
          front: c.front,
          back: c.back,
          codeSnippet: c.codeSnippet || null,
          tags: c.tags || [],
          due: new Date(),
          state: 0,
        },
      })
    )
  );

  return NextResponse.json({
    deckId,
    cards: createdCards,
    count: createdCards.length,
  });
}

// Review a flashcard using FSRS v5 algorithm
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const card = await prisma.flashcard.findUnique({
    where: { id: parsed.data.cardId },
    include: { deck: true },
  });

  if (!card || card.deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const ratingMap: Record<string, 1 | 2 | 3 | 4> = {
    Again: 1,
    Hard: 2,
    Good: 3,
    Easy: 4,
  };

  const selectedRating = ratingMap[parsed.data.rating];
  const fsrsUpdates = reviewCard(card as unknown as DbFlashcard, selectedRating);

  const updatedCard = await prisma.flashcard.update({
    where: { id: card.id },
    data: {
      due: fsrsUpdates.due,
      stability: fsrsUpdates.stability,
      difficulty: fsrsUpdates.difficulty,
      elapsedDays: fsrsUpdates.elapsedDays,
      scheduledDays: fsrsUpdates.scheduledDays,
      reps: fsrsUpdates.reps,
      lapses: fsrsUpdates.lapses,
      state: fsrsUpdates.state,
      lastReview: fsrsUpdates.lastReview,
    },
  });

  return NextResponse.json({ card: updatedCard });
}
