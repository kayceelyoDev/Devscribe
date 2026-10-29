import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-zinc-50">
      <div className="max-w-3xl space-y-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-violet-300">DevScribe Engine</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Self-hosted study, analysis, and review for your local workspace.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-zinc-300">
          Built for local Ubuntu inference, document study, grammar audits, code review, and oral exam drills.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login"><Button size="lg">Open workspace</Button></Link>
          <Link href="/dashboard"><Button variant="outline" size="lg">View dashboard</Button></Link>
        </div>
      </div>
    </main>
  );
}
