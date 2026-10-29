import { z } from "zod";

export const flashcardSchema = z.object({
  front: z.string().describe("The question, concept, or prompt on the front of the card"),
  back: z.string().describe("The comprehensive explanation or answer on the back"),
  codeSnippet: z.string().optional().nullable().describe("Optional code sample illustrating the concept"),
  tags: z.array(z.string()).default([]),
});

export const flashcardListSchema = z.object({
  cards: z.array(flashcardSchema),
});

export const grammarIssueSchema = z.object({
  id: z.string(),
  original: z.string().describe("The exact original text snippet containing the issue"),
  replacement: z.string().describe("The proposed high-quality replacement"),
  category: z.enum(["grammar", "clarity", "tone", "conciseness"]),
  explanation: z.string().describe("Educational explanation of why the change is recommended"),
});

export const grammarAuditResultSchema = z.object({
  revisedText: z.string(),
  issues: z.array(grammarIssueSchema),
  score: z.number().min(0).max(100),
  tone: z.string(),
});

export const codeReviewSchema = z.object({
  title: z.string(),
  summary: z.string(),
  optimizedCode: z.string(),
  mermaidGraph: z.string().describe("Valid Mermaid.js graph string (e.g. flowchart TD or graph TD)"),
  complexity: z.object({
    time: z.string(),
    space: z.string(),
    reasoning: z.string(),
  }),
  findings: z.array(
    z.object({
      line: z.number(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      title: z.string(),
      fix: z.string(),
    }),
  ),
});

export const examinerQuizSchema = z.object({
  question: z.string(),
  topic: z.string(),
  idealAnswer: z.string(),
  keyPoints: z.array(z.string()),
});

export const examinerEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  critique: z.string(),
  missingConcepts: z.array(z.string()),
  idealAnswer: z.string(),
});

export const examinerBugChallengeSchema = z.object({
  title: z.string(),
  description: z.string(),
  language: z.string(),
  buggyCode: z.string(),
  bugLine: z.number(),
  explanation: z.string(),
  fixedCode: z.string(),
  hint: z.string(),
});
