"use client";

import * as React from "react";
import {
  BrainCircuit,
  Sparkles,
  Bug,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Send,
  Award,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentItem {
  id: string;
  title: string;
}

export default function ExaminerPage() {
  const [mode, setMode] = React.useState<"oral_quiz" | "socratic_code_debug">("oral_quiz");
  const [topic, setTopic] = React.useState("Distributed Locks & Consensus");
  const [difficulty, setDifficulty] = React.useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = React.useState<string>("");

  // Session state
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string>("");
  const [currentPrompt, setCurrentPrompt] = React.useState<any>(null);
  const [userAnswer, setUserAnswer] = React.useState("");
  const [suspectedLine, setSuspectedLine] = React.useState<number | "">("");
  const [evaluation, setEvaluation] = React.useState<any>(null);

  // Load user documents
  React.useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch {
        // quiet
      }
    }
    fetchDocs();
  }, []);

  async function handleStartSession() {
    setLoading(true);
    setEvaluation(null);
    setUserAnswer("");
    setSuspectedLine("");

    try {
      const res = await fetch("/api/ai/examiner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          mode,
          topic,
          documentId: selectedDocId || undefined,
          difficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId);
        setCurrentPrompt(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!sessionId || !userAnswer.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/ai/examiner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_answer",
          sessionId,
          userAnswer,
          question: currentPrompt?.question || currentPrompt?.challenge?.title || "Challenge",
          idealAnswer: currentPrompt?.idealAnswer,
          suspectedLine: suspectedLine ? Number(suspectedLine) : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">
                Socratic Technical Examination
              </span>
              <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-300">
                Pedagogical Arena
              </Badge>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              Socratic Examiner & Debug Arena
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Engage in technical oral examinations or test your fault localization in the Saboteur bug arena.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            <button
              onClick={() => {
                setMode("oral_quiz");
                setCurrentPrompt(null);
                setEvaluation(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === "oral_quiz" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              Oral Quiz Mode
            </button>
            <button
              onClick={() => {
                setMode("socratic_code_debug");
                setCurrentPrompt(null);
                setEvaluation(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                mode === "socratic_code_debug" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Bug className="h-3.5 w-3.5" />
              Spot the Bug Arena
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Session Parameters</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Configure topic context, document source, and difficulty rigor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Target Subject</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Distributed locks, B-trees"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Document Context (Optional)</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">General Knowledge / No Document</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="beginner">Beginner (Foundational)</option>
                  <option value="intermediate">Intermediate (Systems Design)</option>
                  <option value="advanced">Advanced (Kernel/Distributed Rigor)</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleStartSession}
              disabled={loading}
              className="gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs h-9"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? "Preparing Socratic Examination..." : "Begin Examination Session"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Examination Arena */}
        {currentPrompt ? (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Examiner Prompt / Challenge */}
            <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-6 flex flex-col">
              <CardHeader className="pb-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold text-rose-300 border-rose-500/40">
                    {mode === "oral_quiz" ? "Oral Question" : "Bug Localization Challenge"}
                  </Badge>
                  <span className="text-xs text-zinc-500 capitalize">{difficulty} level</span>
                </div>
                <CardTitle className="mt-2 text-lg text-white leading-relaxed">
                  {mode === "oral_quiz"
                    ? currentPrompt.question
                    : currentPrompt.challenge?.title}
                </CardTitle>
                {mode === "socratic_code_debug" ? (
                  <CardDescription className="text-xs text-zinc-400">
                    {currentPrompt.challenge?.description}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="p-4 flex-1 space-y-4">
                {mode === "socratic_code_debug" && currentPrompt.challenge?.buggyCode ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-200 overflow-x-auto">
                    <pre>
                      {currentPrompt.challenge.buggyCode
                        .split("\n")
                        .map((line: string, i: number) => (
                          <div key={i} className="flex gap-4">
                            <span className="text-zinc-600 select-none w-6 text-right">
                              {i + 1}
                            </span>
                            <span>{line}</span>
                          </div>
                        ))}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400 leading-relaxed">
                    Formulate your answer rigorously. Focus on architectural invariants, state machines, algorithmic complexities, and concurrency guarantees.
                  </div>
                )}

                {currentPrompt.challenge?.hint ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <strong>Hint:</strong> {currentPrompt.challenge.hint}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Right: Answer Submission & Evaluation */}
            <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-6 flex flex-col">
              <CardHeader className="pb-3 border-b border-zinc-800">
                <CardTitle className="text-base text-white">Your Response</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  {mode === "oral_quiz"
                    ? "Present your complete technical argument."
                    : "Specify the faulty line and explain the fix."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col space-y-4">
                {mode === "socratic_code_debug" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Suspected Bug Line (Number)</label>
                    <input
                      type="number"
                      value={suspectedLine}
                      onChange={(e) => setSuspectedLine(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 6"
                      className="w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                ) : null}

                <div className="flex-1 space-y-1.5 flex flex-col">
                  <label className="text-xs font-medium text-zinc-300">Explanation & Reasoning</label>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder={
                      mode === "oral_quiz"
                        ? "Discuss the architectural trade-offs, consistency guarantees, and fault handling..."
                        : "Explain why this line is buggy and describe the exact fix..."
                    }
                    className="w-full flex-1 min-h-[140px] rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                  />
                </div>

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !userAnswer.trim()}
                  className="gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs h-9 self-end"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Evaluating Standard..." : "Submit to Examiner"}
                </Button>

                {/* Socratic Feedback Evaluation */}
                {evaluation ? (
                  <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-bold text-white uppercase">
                          Examiner Score: {evaluation.score}/100
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={evaluation.score >= 80 ? "border-emerald-500/40 text-emerald-300" : "border-rose-500/40 text-rose-300"}
                      >
                        {evaluation.score >= 80 ? "Pass" : "Requires Review"}
                      </Badge>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {evaluation.critique}
                    </p>

                    {evaluation.missingConcepts?.length ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Missing or Incomplete Concepts:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {evaluation.missingConcepts.map((mc: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-300"
                            >
                              {mc}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {evaluation.idealAnswer ? (
                      <div className="pt-2 border-t border-zinc-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Exemplary Technical Benchmark:
                        </span>
                        <pre className="mt-1 rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                          {evaluation.idealAnswer}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
