"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  Code2,
  BrainCircuit,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                Local Production Node
              </span>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
                Active
              </Badge>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              DevScribe Workspace
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Spaced repetition, inline grammar auditing, AST code analysis, and Socratic examinations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/study">
              <Button className="gap-2 bg-violet-600 hover:bg-violet-500">
                <BookOpen className="h-4 w-4" /> Start Review
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Indexed Documents
              </CardTitle>
              <Layers className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.documentsCount ?? 0}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                PDF, Markdown & TXT semantic chunks
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                FSRS Flashcard Decks
              </CardTitle>
              <BookOpen className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.decksCount ?? 0}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Scheduled with ts-fsrs v5 algorithm
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Audits & Code Reviews
              </CardTitle>
              <Code2 className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : (stats?.grammarCount ?? 0) + (stats?.codeReviewsCount ?? 0)}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Grammar + AST Mermaid inspections
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Inference Throughput
              </CardTitle>
              <Cpu className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : `${stats?.avgTokensPerSecond ?? "34.5"} tok/s`}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Hardware locked on Ubuntu Server
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Launchpad */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/study" className="group">
            <Card className="h-full border-zinc-800 bg-zinc-900/40 transition hover:border-violet-500/50 hover:bg-zinc-900/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-violet-600/20 p-2.5 text-violet-300">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-white" />
                </div>
                <CardTitle className="mt-3 text-base text-white">Study Engine</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Upload documents, extract semantic chunks, generate 3D flipcards, and export to Anki CSV.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/grammar" className="group">
            <Card className="h-full border-zinc-800 bg-zinc-900/40 transition hover:border-amber-500/50 hover:bg-zinc-900/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-white" />
                </div>
                <CardTitle className="mt-3 text-base text-white">Grammar & Tone Studio</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Inline colored underline auditing in Tiptap, Monaco diff editor, and 1-click mistake-to-flashcard.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/code" className="group">
            <Card className="h-full border-zinc-800 bg-zinc-900/40 transition hover:border-sky-500/50 hover:bg-zinc-900/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-sky-500/20 p-2.5 text-sky-300">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-white" />
                </div>
                <CardTitle className="mt-3 text-base text-white">Code Analyzer</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Monaco code editor, Big-O complexity badges, severity findings, and Mermaid.js control flow.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/examiner" className="group">
            <Card className="h-full border-zinc-800 bg-zinc-900/40 transition hover:border-rose-500/50 hover:bg-zinc-900/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-rose-500/20 p-2.5 text-rose-300">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-white" />
                </div>
                <CardTitle className="mt-3 text-base text-white">Socratic Examiner</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Oral quiz evaluation with concept scoring and Saboteur &quot;Spot the Bug&quot; arena.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Feature Highlights Banner */}
        <Card className="border-zinc-800 bg-gradient-to-r from-violet-950/40 via-zinc-900/60 to-zinc-950 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <h3 className="text-base font-semibold text-white">100% Local Self-Hosted Architecture</h3>
              </div>
              <p className="text-xs text-zinc-400">
                PostgreSQL 16 • Redis 7 • MinIO S3 container • Ollama Qwen3:4b • Zero cloud API lock-in.
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                Configure AI & Hardware
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
