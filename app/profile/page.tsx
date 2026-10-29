"use client";

import * as React from "react";
import {
  UserCircle2,
  Activity,
  Cpu,
  Clock,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  CheckCircle2,
  Shield,
  Save,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const [profileData, setProfileData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState("");

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
          setName(data.user?.name || "");
          setEmail(data.user?.email || "");
        }
      } catch {
        // quiet
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (res.ok) {
        setStatusMessage("Profile details updated successfully.");
        setTimeout(() => setStatusMessage(""), 3500);
      }
    } catch {
      setStatusMessage("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  const stats = profileData?.stats;
  const user = profileData?.user;

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              User Identity & Hardware Telemetry
            </span>
            <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
              Argon2id Vault
            </Badge>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
            Profile & Telemetry Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Account credentials, offline vault metadata, and local Ubuntu hardware telemetry.
          </p>
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        {/* Telemetry Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Average Speed
              </CardTitle>
              <Zap className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : `${stats?.avgTokensPerSecond ?? "0"} tok/s`}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Throughput on local hardware
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Mean Latency
              </CardTitle>
              <Clock className="h-4 w-4 text-violet-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : `${stats?.avgDurationMs ?? "0"} ms`}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                End-to-end model inference
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Total Queries
              </CardTitle>
              <Activity className="h-4 w-4 text-sky-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.totalAiQueries ?? 0}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Across flashcards, code & grammar
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Total Tokens
              </CardTitle>
              <Cpu className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loading ? "..." : stats?.totalTokens?.toLocaleString() ?? 0}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Prompt + completion volume
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Account Settings */}
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 text-violet-400" />
              <CardTitle className="text-base text-white">Account Details</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Local user identity for this self-hosted workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Username (Permanent)</label>
                  <input
                    type="text"
                    disabled
                    value={user?.username || ""}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@local.network"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Protected by Argon2id & 24-character recovery vault
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs h-9"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Updating..." : "Update Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
