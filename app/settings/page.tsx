"use client";

import * as React from "react";
import {
  ShieldCheck,
  Cpu,
  Sparkles,
  KeyRound,
  CheckCircle2,
  HardDrive,
  Database,
  Activity,
  Save,
  Server,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");

  const [settings, setSettings] = React.useState({
    activeProvider: "local",
    ollamaBaseUrl: "http://host.docker.internal:11434/v1",
    localModelName: "qwen3:4b",
    localEmbeddingModel: "nomic-embed-text",
    geminiApiKey: "",
    hasGeminiKey: false,
    temperature: 0.2,
    maxChunkTokens: 1000,
    theme: "dark",
  });

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } catch {
        // quiet
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setStatusMessage("Settings and hardware parameters saved successfully.");
        setTimeout(() => setStatusMessage(""), 4000);
      } else {
        setStatusMessage("Failed to save settings.");
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || "Failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                System Configuration
              </span>
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
                Dual Provider Architecture
              </Badge>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              AI & Hardware Settings
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configure local Ubuntu Ollama inference, AES-256-GCM Gemini fallback, and RAG chunk thresholds.
            </p>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {/* AI Provider Switcher */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Active AI Inference Provider</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Select primary model execution path. Local requests are automatically guarded by the Redis hardware lock.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                onClick={() => setSettings((s) => ({ ...s, activeProvider: "local" }))}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  settings.activeProvider === "local"
                    ? "border-violet-500 bg-violet-950/20 text-white shadow-md ring-1 ring-violet-500/40"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Cpu className="h-4 w-4 text-violet-400" />
                    Local Ubuntu Ollama
                  </div>
                  {settings.activeProvider === "local" ? (
                    <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-300">
                      Active
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-400">
                  100% private, runs entirely on your local hardware. Zero external network egress.
                </p>
              </div>

              <div
                onClick={() => setSettings((s) => ({ ...s, activeProvider: "gemini" }))}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  settings.activeProvider === "gemini"
                    ? "border-sky-500 bg-sky-950/20 text-white shadow-md ring-1 ring-sky-500/40"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-sky-400" />
                    Google Gemini
                  </div>
                  {settings.activeProvider === "gemini" ? (
                    <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-300">
                      Active
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-400">
                  Cloud fallback using gemini-2.5-flash with your encrypted personal API key.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local Ubuntu Ollama Configuration */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-violet-400" />
              <CardTitle className="text-base text-white">Local Ollama Parameters</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Host configuration for running Qwen and embeddings locally on Ubuntu Server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Ollama API Base URL</label>
                <input
                  type="text"
                  value={settings.ollamaBaseUrl}
                  onChange={(e) => setSettings((s) => ({ ...s, ollamaBaseUrl: e.target.value }))}
                  placeholder="http://host.docker.internal:11434/v1"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <p className="text-[11px] text-zinc-500">
                  Use host.docker.internal:11434/v1 in Docker, or localhost:11434/v1 on laptop.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Local Model Name</label>
                <input
                  type="text"
                  value={settings.localModelName}
                  onChange={(e) => setSettings((s) => ({ ...s, localModelName: e.target.value }))}
                  placeholder="qwen3:4b"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <p className="text-[11px] text-zinc-500">
                  Model pulled via ollama pull (e.g. qwen3:4b, qwen2.5:3b, or qwen2.5:7b).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Local Embedding Model</label>
              <input
                type="text"
                value={settings.localEmbeddingModel}
                onChange={(e) => setSettings((s) => ({ ...s, localEmbeddingModel: e.target.value }))}
                placeholder="nomic-embed-text"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gemini Cloud Fallback Key Vault */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-sky-400" />
              <CardTitle className="text-base text-white">Google Gemini API Key (Encrypted at Rest)</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Optional cloud API key encrypted with AES-256-GCM before writing to PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Gemini API Key</label>
                {settings.hasGeminiKey ? (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">
                    Encrypted Key Saved
                  </Badge>
                ) : null}
              </div>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(e) => setSettings((s) => ({ ...s, geminiApiKey: e.target.value }))}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* RAG & Temperature Tuning */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">Inference & RAG Parameters</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Fine-tune temperature and document chunk window size.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-300">Global Temperature: {settings.temperature}</span>
                <span className="text-zinc-500">Lower = deterministic, Higher = creative</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => setSettings((s) => ({ ...s, temperature: Number(e.target.value) }))}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Semantic Chunk Target (Tokens)</label>
              <input
                type="number"
                min={200}
                max={4000}
                value={settings.maxChunkTokens}
                onChange={(e) => setSettings((s) => ({ ...s, maxChunkTokens: Number(e.target.value) }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
