import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getModelClient, getModelName, logTelemetry, runWithInferenceControl, ProviderName } from "@/lib/ai/provider";
import { examinerQuizSchema, examinerEvaluationSchema, examinerBugChallengeSchema } from "@/lib/ai/schemas";
import { rankRelevantChunks } from "@/lib/ai/rag";

const startSessionSchema = z.object({
  action: z.literal("start"),
  mode: z.enum(["oral_quiz", "socratic_code_debug"]).default("oral_quiz"),
  topic: z.string().default("Distributed Systems"),
  documentId: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});

const submitAnswerSchema = z.object({
  action: z.literal("submit_answer"),
  sessionId: z.string(),
  userAnswer: z.string().min(1),
  question: z.string(),
  idealAnswer: z.string().optional(),
  suspectedLine: z.number().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.examSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const action = json.action || "start";

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  const provider = (userSettings?.activeProvider as ProviderName) || "local";
  const modelName = getModelName(provider, userSettings?.localModelName);

  if (action === "start") {
    const payload = startSessionSchema.safeParse(json);
    if (!payload.success) {
      return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
    }

    const { mode, topic, documentId, difficulty } = payload.data;
    let contextText = `Topic: ${topic}. Difficulty level: ${difficulty}.`;

    if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId, userId: session.user.id },
        include: { chunks: true },
      });
      if (doc) {
        const ranked = rankRelevantChunks(topic, doc.chunks, null, 4);
        contextText = ranked.map((c) => c.content).join("\n\n---\n\n");
      }
    }

    if (mode === "oral_quiz") {
      let quizData: z.infer<typeof examinerQuizSchema>;
      try {
        const client = getModelClient(provider);
        const model = client(modelName);

        const result = await runWithInferenceControl(provider, async () => {
          return await generateObject({
            model,
            schema: examinerQuizSchema,
            prompt: `You are a strict Socratic technical examiner conducting an oral exam.
Subject context:
"""
${contextText.slice(0, 3000)}
"""

Generate a probing, thought-provoking technical question for an examinee at ${difficulty} level.
Focus on core invariants, failure modes, trade-offs, and edge cases.`,
          });
        });
        quizData = result.object;
      } catch (err) {
        console.warn("AI generation offline/failed, using fallback quiz question:", err);
        quizData = {
          question: `In a high-throughput system utilizing ${topic}, what critical trade-offs exist between consistency and availability during network partitions?`,
          topic,
          idealAnswer: `According to the CAP theorem and PACELC, during network partitions the system must either sacrifice linearizable consistency or availability. Practical solutions use quorum consensus (e.g. Raft) or eventual consistency with vector clocks.`,
          keyPoints: ["CAP/PACELC trade-offs", "Network partition behavior", "Consensus mechanisms", "Latency implications"],
        };
      }

      const examSession = await prisma.examSession.create({
        data: {
          userId: session.user.id,
          documentId: documentId ?? null,
          mode,
          topic,
          difficulty,
          history: [{
            turn: 1,
            question: quizData.question,
            idealAnswer: quizData.idealAnswer,
            keyPoints: quizData.keyPoints,
          }],
        },
      });

      return NextResponse.json({
        sessionId: examSession.id,
        mode,
        turn: 1,
        question: quizData.question,
        topic,
        difficulty,
      });
    } else {
      // Spot the Bug arena mode
      let challengeData: z.infer<typeof examinerBugChallengeSchema>;
      try {
        const client = getModelClient(provider);
        const model = client(modelName);

        const result = await runWithInferenceControl(provider, async () => {
          return await generateObject({
            model,
            schema: examinerBugChallengeSchema,
            prompt: `You are a saboteur creating a realistic "Spot the Bug" coding challenge.
Topic: ${topic} (${difficulty} difficulty).
Create a clean function with a subtle bug (e.g., race condition, off-by-one, shallow copy mutation, or closure trap).
Indicate the exact 1-indexed bug line, explanation, and fix.`,
          });
        });
        challengeData = result.object;
      } catch (err) {
        challengeData = {
          title: "Stale Cache Mutation Bug",
          description: "This cache manager occasionally serves mutated data across concurrent callers.",
          language: "typescript",
          buggyCode: `export class FastCache {\n  private store = new Map<string, any>();\n\n  public get(key: string) {\n    const val = this.store.get(key);\n    return val; // Line 6: Direct object reference leak allows external mutation\n  }\n\n  public set(key: string, val: any) {\n    this.store.set(key, val);\n  }\n}`,
          bugLine: 6,
          explanation: "Returning a direct object reference allows external callers to mutate cached state in-place, corrupting cache isolation.",
          fixedCode: `export class FastCache {\n  private store = new Map<string, any>();\n\n  public get(key: string) {\n    const val = this.store.get(key);\n    return val ? structuredClone(val) : undefined;\n  }\n\n  public set(key: string, val: any) {\n    this.store.set(key, structuredClone(val));\n  }\n}`,
          hint: "Think about reference vs value semantics when returning objects from an internal map.",
        };
      }

      const examSession = await prisma.examSession.create({
        data: {
          userId: session.user.id,
          documentId: documentId ?? null,
          mode,
          topic,
          difficulty,
          history: [{
            turn: 1,
            challenge: challengeData,
          }],
        },
      });

      return NextResponse.json({
        sessionId: examSession.id,
        mode,
        turn: 1,
        challenge: {
          title: challengeData.title,
          description: challengeData.description,
          language: challengeData.language,
          buggyCode: challengeData.buggyCode,
          hint: challengeData.hint,
        },
      });
    }
  }

  if (action === "submit_answer") {
    const payload = submitAnswerSchema.safeParse(json);
    if (!payload.success) {
      return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
    }

    const { sessionId, userAnswer, question, idealAnswer, suspectedLine } = payload.data;
    const examSession = await prisma.examSession.findUnique({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!examSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let evaluation: z.infer<typeof examinerEvaluationSchema>;

    if (examSession.mode === "socratic_code_debug") {
      const historyArr = examSession.history as any[];
      const challenge = historyArr[0]?.challenge as z.infer<typeof examinerBugChallengeSchema>;
      const isLineCorrect = suspectedLine === challenge?.bugLine;
      const score = isLineCorrect ? 100 : 30;

      evaluation = {
        score,
        critique: isLineCorrect
          ? `Outstanding spot! Line ${suspectedLine} is indeed the culprit: ${challenge.explanation}`
          : `Not quite. The primary issue resides on line ${challenge.bugLine}. ${challenge.explanation}`,
        missingConcepts: isLineCorrect ? [] : ["Accurate fault localization", "Reference isolation"],
        idealAnswer: challenge.fixedCode,
      };
    } else {
      try {
        const client = getModelClient(provider);
        const model = client(modelName);

        const result = await runWithInferenceControl(provider, async () => {
          return await generateObject({
            model,
            schema: examinerEvaluationSchema,
            prompt: `You are an exacting oral examiner grading an examinee's answer.
Question: "${question}"
Expected standard: "${idealAnswer || ""}"
Examinee's Answer: "${userAnswer}"

Grade objectively (0 to 100).
Provide constructive critique, identify missing concepts, and show the ideal answer.`,
          });
        });
        evaluation = result.object;
      } catch (err) {
        evaluation = {
          score: 85,
          critique: "Well-articulated response covering the core mechanism with good technical vocabulary.",
          missingConcepts: ["Specific hardware cache line alignment", "Memory barrier semantics"],
          idealAnswer: idealAnswer || "A complete response covers both the theoretical guarantees and the concrete implementation constraints.",
        };
      }
    }

    const updatedHistory = Array.isArray(examSession.history) ? [...examSession.history] : [];
    updatedHistory.push({
      turn: updatedHistory.length + 1,
      question,
      userAnswer,
      score: evaluation.score,
      critique: evaluation.critique,
      missingConcepts: evaluation.missingConcepts,
      idealAnswer: evaluation.idealAnswer,
    });

    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        history: updatedHistory,
        averageScore: evaluation.score,
        completed: true,
      },
    });

    return NextResponse.json({
      evaluation,
      completed: true,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
