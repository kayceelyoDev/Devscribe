"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  BookOpen,
  BrainCircuit,
  Code2,
  FileText,
  Gauge,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Search,
  Command as CommandIcon,
  HardDrive,
  Cpu,
  Layers,
  Database,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Study Engine", href: "/study", icon: BookOpen },
  { label: "Grammar Studio", href: "/grammar", icon: FileText },
  { label: "Code Analyzer", href: "/code", icon: Code2 },
  { label: "Socratic Examiner", href: "/examiner", icon: BrainCircuit },
  { label: "Settings & AI", href: "/settings", icon: ShieldCheck },
  { label: "Profile & Telemetry", href: "/profile", icon: UserCircle2 },
];

interface HealthState {
  status: string;
  checks: {
    database: string;
    redis: string;
    storage: string;
    ollama: string;
  };
  activeModel: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [health, setHealth] = React.useState<HealthState | null>(null);
  const [activeProvider, setActiveProvider] = React.useState<string>("local");

  // Fetch live health periodically
  React.useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } catch {
        // quiet
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current provider setting
  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setActiveProvider(data.activeProvider || "local");
        }
      } catch {
        // quiet
      }
    }
    loadSettings();
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  async function switchProvider(prov: "local" | "gemini") {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeProvider: prov }),
      });
      setActiveProvider(prov);
      setCommandOpen(false);
      router.refresh();
    } catch {
      // quiet
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-violet-500 selection:text-white">
      <div className="mx-auto flex w-full flex-1 max-w-[1920px]">
        {/* Left Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 p-4 lg:flex">
          {/* Logo */}
          <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/40">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                Local Workspace
              </div>
              <div className="text-base font-bold text-white tracking-tight">DevScribe</div>
            </div>
          </Link>

          {/* Search Trigger Button */}
          <button
            onClick={() => setCommandOpen(true)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              Quick search...
            </span>
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            {navItems.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-violet-600/15 text-violet-200 font-semibold ring-1 ring-violet-500/30"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-violet-400" : "text-zinc-500")} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* System Health Card */}
          <div className="mt-auto space-y-3 pt-4">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs">
              <div className="flex items-center justify-between font-medium text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Activity className={cn("h-3.5 w-3.5", health?.status === "healthy" ? "text-emerald-400" : "text-amber-400")} />
                  Hardware Nodes
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">{activeProvider}</span>
              </div>

              <div className="mt-2.5 space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3 w-3 text-zinc-500" /> PostgreSQL
                  </span>
                  <span className={health?.checks?.database === "ok" ? "text-emerald-400" : "text-rose-400"}>
                    {health?.checks?.database || "checking"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-zinc-500" /> Redis Cache
                  </span>
                  <span className={health?.checks?.redis === "ok" ? "text-emerald-400" : "text-zinc-400"}>
                    {health?.checks?.redis || "checking"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-3 w-3 text-zinc-500" /> MinIO S3
                  </span>
                  <span className={health?.checks?.storage === "ok" ? "text-emerald-400" : "text-zinc-400"}>
                    {health?.checks?.storage || "checking"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-3 w-3 text-zinc-500" /> Ollama Qwen
                  </span>
                  <span className={health?.checks?.ollama === "ok" ? "text-emerald-400" : "text-amber-400"}>
                    {health?.checks?.ollama || "checking"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar (Mobile / Responsive) */}
          <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 px-4 lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <span className="font-bold text-white">DevScribe</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCommandOpen(true)}
                className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-white"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>

          {/* Persistent Live Telemetry Footer */}
          <footer className="flex h-10 items-center justify-between border-t border-zinc-800/80 bg-zinc-950 px-4 text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", health?.status === "healthy" ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                Stack: {health?.status === "healthy" ? "Live" : "Dev Fallback Mode"}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="font-mono text-zinc-300">
                Model: {activeProvider === "local" ? "qwen3:4b (Local Ollama)" : "gemini-2.5-flash (Cloud)"}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <span className="text-zinc-500">Hardware Mutex: Active</span>
              <span className="text-zinc-600">|</span>
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-1 text-zinc-400 hover:text-white"
              >
                <CommandIcon className="h-3 w-3" />
                <span>Command Palette</span>
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search workspace..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => {
                router.push("/dashboard");
                setCommandOpen(false);
              }}
            >
              <Gauge className="mr-2 h-4 w-4" /> Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/study");
                setCommandOpen(false);
              }}
            >
              <BookOpen className="mr-2 h-4 w-4" /> Study Engine & FSRS Cards
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/grammar");
                setCommandOpen(false);
              }}
            >
              <FileText className="mr-2 h-4 w-4" /> Grammar & Tone Studio
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/code");
                setCommandOpen(false);
              }}
            >
              <Code2 className="mr-2 h-4 w-4" /> Code Analyzer & Mermaid
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/examiner");
                setCommandOpen(false);
              }}
            >
              <BrainCircuit className="mr-2 h-4 w-4" /> Socratic Oral Examiner
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/settings");
                setCommandOpen(false);
              }}
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Settings & Providers
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="AI Provider Switch">
            <CommandItem onSelect={() => switchProvider("local")}>
              <Cpu className="mr-2 h-4 w-4 text-violet-400" />
              Switch to Local Ubuntu Ollama (qwen3:4b)
              {activeProvider === "local" ? (
                <Badge variant="outline" className="ml-auto text-[10px]">Active</Badge>
              ) : null}
            </CommandItem>
            <CommandItem onSelect={() => switchProvider("gemini")}>
              <Sparkles className="mr-2 h-4 w-4 text-sky-400" />
              Switch to Google Gemini (gemini-2.5-flash)
              {activeProvider === "gemini" ? (
                <Badge variant="outline" className="ml-auto text-[10px]">Active</Badge>
              ) : null}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
