"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, Download, Copy, Check, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ username: "", recoveryKey: "", newPassword: "" });
  const [newRecoveryKey, setNewRecoveryKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Password reset failed. Please check your recovery key.");
        return;
      }

      setNewRecoveryKey(data.newRecoveryKey);
    } catch (err: any) {
      setError(err?.message || "Failed to process recovery request.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(newRecoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadKit() {
    const textContent = `=====================================================
DEVSCRIBE ENGINE - ROTATED ACCOUNT RECOVERY KIT
=====================================================
Username: ${form.username}
Rotated At: ${new Date().toISOString()}

NEW RECOVERY KEY:
${newRecoveryKey}

IMPORTANT INSTRUCTIONS:
- Your previous recovery key has been invalidated.
- This new 24-character recovery key is the ONLY mechanism to reset your password.
=====================================================`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devscribe-recovery-kit-${form.username}-rotated.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 selection:bg-violet-500 selection:text-white">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Offline Vault Recovery
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Verify your username and 24-char recovery key to rotate your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!newRecoveryKey ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  required
                  value={form.username}
                  onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))}
                  placeholder="developer"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recoveryKey">24-Character Recovery Key</Label>
                <Input
                  id="recoveryKey"
                  required
                  value={form.recoveryKey}
                  onChange={(e) => setForm((c) => ({ ...c, recoveryKey: e.target.value.toUpperCase() }))}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                  className="font-mono tracking-widest uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password (min 8 chars)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  value={form.newPassword}
                  onChange={(e) => setForm((c) => ({ ...c, newPassword: e.target.value }))}
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
                {loading ? "Verifying Vault..." : "Reset Password & Rotate Key"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>Password successfully reset! Your previous recovery key has expired. Save your new rotated key below:</span>
              </div>

              <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4 font-mono text-center text-lg font-bold tracking-widest text-violet-200">
                {newRecoveryKey}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" onClick={handleDownloadKit} className="gap-2">
                  <Download className="h-4 w-4 text-violet-400" />
                  Download Kit
                </Button>
              </div>

              <Link href="/login" className="block w-full">
                <Button className="w-full gap-2">
                  Proceed to Sign In <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          <div className="mt-5 text-center text-sm text-zinc-400">
            Remember your credentials?{" "}
            <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
