"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, KeyRound, Download, Copy, Check, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const reason =
          data?.error?.fieldErrors?.username?.[0] ||
          data?.error?.fieldErrors?.password?.[0] ||
          data?.error ||
          "Registration failed.";
        setError(typeof reason === "string" ? reason : "Registration failed.");
        return;
      }

      if (data.recoveryKey) {
        setRecoveryKey(data.recoveryKey);
        setShowVaultModal(true);
      } else {
        router.push("/login");
      }
    } catch (submitError: any) {
      setError(submitError?.message || "Unable to register right now.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadKit() {
    const textContent = `=====================================================
DEVSCRIBE ENGINE - OFFLINE ACCOUNT RECOVERY KIT
=====================================================
Username: ${form.username}
Generated: ${new Date().toISOString()}

RECOVERY KEY:
${recoveryKey}

IMPORTANT INSTRUCTIONS:
- DevScribe is a 100% locally self-hosted workspace with zero external email servers.
- This 24-character recovery key is the ONLY mechanism to reset your password if forgotten.
- Store this file in a secure password manager or encrypted drive.
=====================================================`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devscribe-recovery-kit-${form.username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleEnterWorkspace() {
    setShowVaultModal(false);
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 selection:bg-violet-500 selection:text-white">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Create DevScribe Account
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Self-hosted AI workspace for document study, grammar, and code analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                value={form.username}
                onChange={(e) => setForm((curr) => ({ ...curr, username: e.target.value }))}
                placeholder="developer"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
                placeholder="dev@local.network"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password (min 8 chars)</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((curr) => ({ ...curr, password: e.target.value }))}
                placeholder="••••••••••••"
              />
            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Generating Argon2id Vault..." : "Create Account & Generate Recovery Key"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Mandatory Recovery Key Vault Modal */}
      <Dialog open={showVaultModal} onOpenChange={setShowVaultModal}>
        <DialogContent className="max-w-lg border-zinc-800 bg-zinc-900 text-zinc-100">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-violet-400">
              <KeyRound className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Master Offline Vault</span>
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Save Your 24-Character Recovery Key
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              DevScribe operates 100% locally with zero external recovery services. If you ever lose your password, this cryptographic key is the <strong className="text-zinc-200">only</strong> way to recover your account.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4 font-mono text-center text-lg font-bold tracking-widest text-violet-200 selection:bg-violet-600">
              {recoveryKey}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopy}
                className="flex items-center justify-center gap-2"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Key"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDownloadKit}
                className="flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4 text-violet-400" />
                Download .txt Kit
              </Button>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedSaved}
                onChange={(e) => setConfirmedSaved(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500"
              />
              <span>
                I confirm that I have safely copied or downloaded my 24-character recovery key and understand it cannot be recovered if lost.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              className="w-full gap-2"
              disabled={!confirmedSaved}
              onClick={handleEnterWorkspace}
            >
              Continue to Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
