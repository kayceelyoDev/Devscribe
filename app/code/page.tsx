"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Code2,
  Sparkles,
  GitPullRequest,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Split,
  Eye,
  Copy,
  Workflow,
  Cpu,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Dynamically import Monaco Editor and DiffEditor to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), { ssr: false });
const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), { ssr: false });

interface Finding {
  line: number;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  fix: string;
}

interface ReviewResult {
  title: string;
  summary: string;
  optimizedCode: string;
  mermaidGraph: string;
  complexity: {
    time: string;
    space: string;
    reasoning: string;
  };
  findings: Finding[];
}

export default function CodePage() {
  const [code, setCode] = React.useState(
`// Inspecting cache eviction and concurrency logic
export function processQueue(items: any[]) {
  const seen = new Set();
  const results = [];

  for (let i = 0; i < items.length; i++) {
    console.log("Checking item:", items[i]);
    if (!seen.has(items[i].id)) {
      seen.add(items[i].id);
      results.push(items[i]);
    }
  }

  return results;
}`
  );

  const [language, setLanguage] = React.useState("typescript");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [review, setReview] = React.useState<ReviewResult | null>(null);
  const [viewMode, setViewMode] = React.useState<"findings" | "diff" | "flowchart">("findings");
  const [mermaidSvg, setMermaidSvg] = React.useState<string>("");
  const [cardStatus, setCardStatus] = React.useState<string>("");

  // Mermaid rendering
  React.useEffect(() => {
    async function renderMermaid() {
      if (!review?.mermaidGraph) return;
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, review.mermaidGraph);
        setMermaidSvg(svg);
      } catch (err) {
        console.warn("Mermaid render error:", err);
      }
    }
    renderMermaid();
  }, [review?.mermaidGraph]);

  async function handleAnalyzeCode() {
    if (!code.trim()) return;
    setAnalyzing(true);
    setCardStatus("");

    try {
      const res = await fetch("/api/ai/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReview(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSendBugToStudyDeck(finding: Finding) {
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Bug Pattern: ${finding.title} (${finding.severity.toUpperCase()})`,
          count: 1,
        }),
      });

      if (res.ok) {
        setCardStatus(`Sent bug pattern "${finding.title}" to Study Deck!`);
        setTimeout(() => setCardStatus(""), 3500);
      }
    } catch {
      // quiet
    }
  }

  const severityBadgeClass: Record<string, string> = {
    critical: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    high: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    low: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                Static & AST Auditor
              </span>
              {review?.complexity ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
                    Time: {review.complexity.time}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
                    Space: {review.complexity.space}
                  </Badge>
                </div>
              ) : null}
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              Code Analyzer & Control Flow
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Monaco editor, Big-O complexity badges, line-specific severity findings, and Mermaid.js diagrams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="rust">Rust</option>
              <option value="go">Go</option>
              <option value="sql">SQL</option>
              <option value="cpp">C++</option>
            </select>

            <Button
              onClick={handleAnalyzeCode}
              disabled={analyzing}
              className="gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              {analyzing ? "Analyzing AST..." : "Analyze Code"}
            </Button>
          </div>
        </div>

        {cardStatus ? (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-3 text-xs text-violet-200">
            {cardStatus}
          </div>
        ) : null}

        {/* View Switcher Tabs */}
        {review ? (
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
            <button
              onClick={() => setViewMode("findings")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "findings" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Findings & Architecture
            </button>
            <button
              onClick={() => setViewMode("diff")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "diff" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              Monaco Diff Refactor
            </button>
            <button
              onClick={() => setViewMode("flowchart")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                viewMode === "flowchart" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              Mermaid Control Flow
            </button>
          </div>
        ) : null}

        {/* Workspace Panels */}
        {viewMode === "findings" ? (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Input Monaco Editor */}
            <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-6 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white">Source Input ({language})</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Full syntax-highlighted Monaco editor.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="h-[440px] w-full">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right: Findings & Complexity */}
            <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-6 flex flex-col">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-base text-white">
                  {review ? review.title : "Analysis Overview"}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  {review ? review.summary : "Run analysis to inspect Big-O complexity and defects."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 flex-1 space-y-4 overflow-y-auto max-h-[440px]">
                {review?.complexity ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span>Big-O Complexity Audit</span>
                      <div className="flex gap-2">
                        <span className="text-violet-300">Time: {review.complexity.time}</span>
                        <span className="text-emerald-300">Space: {review.complexity.space}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {review.complexity.reasoning}
                    </p>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Defects & Recommendations ({review?.findings?.length || 0})
                  </div>

                  {!review?.findings?.length ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                      No defects recorded yet. Click &quot;Analyze Code&quot; to begin.
                    </div>
                  ) : (
                    review.findings.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">
                              Line {f.line}
                            </span>
                            <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${severityBadgeClass[f.severity] || ""}`}>
                              {f.severity}
                            </Badge>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendBugToStudyDeck(f)}
                            className="h-7 text-[11px] border-zinc-700 text-violet-300 hover:bg-zinc-800 gap-1.5"
                          >
                            <BookOpen className="h-3 w-3" />
                            To Study Deck
                          </Button>
                        </div>

                        <div className="text-xs font-medium text-white">{f.title}</div>
                        <div className="text-xs text-zinc-300 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 font-mono">
                          {f.fix}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : viewMode === "diff" ? (
          /* Monaco Diff View */
          <Card className="border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-base text-white">Monaco Diff Refactor</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Left: Original Input Code • Right: Optimized Idiomatic Refactor
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px] w-full">
                <DiffEditor
                  height="100%"
                  theme="vs-dark"
                  language={language}
                  original={code}
                  modified={review?.optimizedCode || code}
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
        ) : (
          /* Mermaid Flowchart View */
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-base text-white">Mermaid.js Control-Flow Architecture</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Interactive control graph representing branch decisions and execution paths.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {mermaidSvg ? (
                <div
                  className="flex justify-center overflow-x-auto p-4 rounded-xl bg-zinc-950 border border-zinc-800"
                  dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                />
              ) : (
                <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
                  {review?.mermaidGraph}
                </pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
