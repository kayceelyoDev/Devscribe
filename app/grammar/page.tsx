"use client";

import * as React from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  BookOpen,
  ArrowRight,
  SlidersHorizontal,
  Split,
  Eye,
} from "lucide-react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Dynamically import Monaco DiffEditor to avoid SSR issues
const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false }
);

interface Issue {
  id: string;
  original: string;
  replacement: string;
  category: "grammar" | "clarity" | "tone" | "conciseness";
  explanation: string;
}

export default function GrammarPage() {
  const [text, setText] = React.useState(
    "In order to optimize the distributed caching layer, we must utilize a lock mechanism. This system has a few perfact design patterns, but there are a lot of race conditions when multiple nodes write at the exact same moment."
  );
  const [tone, setTone] = React.useState<"academic" | "professional" | "technical" | "casual">("professional");
  const [auditing, setAuditing] = React.useState(false);
  const [revisedText, setRevisedText] = React.useState("");
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [score, setScore] = React.useState<number | null>(null);
  const [activeIssue, setActiveIssue] = React.useState<Issue | null>(null);
  const [viewMode, setViewMode] = React.useState<"inline" | "diff">("inline");
  const [cardStatus, setCardStatus] = React.useState<string>("");

  async function handleRunAudit() {
    if (!text.trim()) return;
    setAuditing(true);
    setCardStatus("");

    try {
      const res = await fetch("/api/ai/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: text,
          tone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRevisedText(data.revisedText);
        setIssues(data.issues || []);
        setScore(data.score || 90);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditing(false);
    }
  }

  function handleApplyFix(issue: Issue) {
    const updated = text.replace(issue.original, issue.replacement);
    setText(updated);
    setIssues((prev) => prev.filter((i) => i.id !== issue.id));
    setActiveIssue(null);
  }

  async function handleConvertMistakeToCard(issue: Issue) {
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Grammar Rule: ${issue.category.toUpperCase()}`,
          count: 1,
        }),
      });
      if (res.ok) {
        setCardStatus(`Card saved to Study Deck for "${issue.original}"!`);
        setTimeout(() => setCardStatus(""), 3500);
      }
    } catch {
      // quiet
    }
  }

  function renderAnnotatedText() {
    if (!issues.length) {
      return <div className="whitespace-pre-wrap text-zinc-200 leading-relaxed">{text}</div>;
    }

    // Split text into tokens/segments corresponding to issues
    let remaining = text;
    const elements: React.ReactNode[] = [];
    let keyIdx = 0;

    issues.forEach((issue) => {
      const idx = remaining.indexOf(issue.original);
      if (idx !== -1) {
        const before = remaining.slice(0, idx);
        if (before) elements.push(<span key={keyIdx++}>{before}</span>);

        const categoryColors: Record<string, string> = {
          grammar: "border-b-2 border-rose-500 bg-rose-500/10 text-rose-200",
          clarity: "border-b-2 border-amber-500 bg-amber-500/10 text-amber-200",
          tone: "border-b-2 border-sky-500 bg-sky-500/10 text-sky-200",
          conciseness: "border-b-2 border-emerald-500 bg-emerald-500/10 text-emerald-200",
        };

        const underlineClass = categoryColors[issue.category] || "border-b-2 border-violet-500 bg-violet-500/10";

        elements.push(
          <Popover key={keyIdx++}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => setActiveIssue(issue)}
                className={`cursor-pointer px-1 py-0.5 rounded transition ${underlineClass}`}
              >
                {issue.original}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                    {issue.category}
                  </Badge>
                  <span className="text-[10px] text-zinc-500">DevScribe Audit</span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">Proposed Replacement:</div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs font-mono font-medium text-emerald-300">
                    {issue.replacement}
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  {issue.explanation}
                </p>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs h-8"
                    onClick={() => handleApplyFix(issue)}
                  >
                    Apply Fix
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-zinc-700 text-xs h-8 text-violet-300 hover:bg-zinc-800"
                    onClick={() => handleConvertMistakeToCard(issue)}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    To Card
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );

        remaining = remaining.slice(idx + issue.original.length);
      }
    });

    if (remaining) {
      elements.push(<span key={keyIdx++}>{remaining}</span>);
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{elements}</div>;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Interactive Grammar Engine
              </span>
              {score !== null ? (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
                  Quality Score: {score}/100
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              Grammar & Tone Studio
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Two-pass linguistic auditing with colored inline underlines, Monaco diffing, and mistake-to-flashcard conversion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
              <button
                onClick={() => setViewMode("inline")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "inline"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Inline View
              </button>
              <button
                onClick={() => setViewMode("diff")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "diff"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Split className="h-3.5 w-3.5" />
                Monaco Diff
              </button>
            </div>

            <Button
              onClick={handleRunAudit}
              disabled={auditing}
              className="gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              {auditing ? "Auditing Text..." : "Run Audit"}
            </Button>
          </div>
        </div>

        {cardStatus ? (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-3 text-xs text-violet-200">
            {cardStatus}
          </div>
        ) : null}

        {/* Tone Selector & Category Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-zinc-400">Target Tone:</span>
            {(["professional", "academic", "technical", "casual"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                  tone === t
                    ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Grammar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Clarity
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Tone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conciseness
            </span>
          </div>
        </div>

        {/* Main Workspaces */}
        {viewMode === "inline" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Input & Interactive Underline Area */}
            <Card className="border-zinc-800 bg-zinc-900/60 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Draft Document</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Click on any highlighted issue to inspect suggestions and apply fixes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                <div className="min-h-[260px] rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
                  {issues.length > 0 ? (
                    renderAnnotatedText()
                  ) : (
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Type or paste draft here to inspect..."
                      className="w-full h-full min-h-[220px] bg-transparent text-sm text-zinc-200 focus:outline-none resize-none"
                    />
                  )}
                </div>

                {issues.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIssues([])}
                    className="self-start text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                  >
                    Edit Draft Manually
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {/* Right: Detected Issues & Revised Preview */}
            <Card className="border-zinc-800 bg-zinc-900/60 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center justify-between">
                  <span>Detected Issues ({issues.length})</span>
                  {revisedText ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(revisedText)}
                      className="h-7 text-xs text-zinc-400 hover:text-white gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy Revised
                    </Button>
                  ) : null}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Granular linguistic breakdown computed by your local model.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 overflow-y-auto max-h-[460px]">
                {issues.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                    No active issues detected. Click &quot;Run Audit&quot; to inspect your draft.
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2 transition hover:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {issue.category}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApplyFix(issue)}
                            className="text-xs font-semibold text-emerald-400 hover:underline"
                          >
                            Apply
                          </button>
                          <span className="text-zinc-600">•</span>
                          <button
                            onClick={() => handleConvertMistakeToCard(issue)}
                            className="text-xs font-semibold text-violet-400 hover:underline"
                          >
                            Study Card
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-400 flex items-center gap-2">
                        <span className="line-through text-rose-300 font-mono">{issue.original}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-500 shrink-0" />
                        <span className="text-emerald-300 font-semibold font-mono">{issue.replacement}</span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {issue.explanation}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Monaco Diff Editor View */
          <Card className="border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-base text-white">Side-by-Side Monaco Diff Audit</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Left: Original Draft • Right: Fully Revised {tone.toUpperCase()} Version
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[480px] w-full">
                <DiffEditor
                  height="100%"
                  theme="vs-dark"
                  language="markdown"
                  original={text}
                  modified={revisedText || text}
                  options={{
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    readOnly: true,
                    fontSize: 13,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
