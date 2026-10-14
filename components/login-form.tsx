"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, PUBLIC_DEV_PHONE_OTP } from "@/lib/env";

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isSupabaseConfigured()) {
      setError("Restart npm run dev after adding Supabase keys.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/phone/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(json.error ?? "Could not send the code.");
      return;
    }
    setSent(true);
    toast.success(json.hint ?? "Enter the code to continue.");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const verified = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });
    const json = await verified.json();
    if (!verified.ok) {
      setLoading(false);
      setError(json.error ?? "Invalid code.");
      return;
    }

    const supabase = createClient();
    let sessionError = (
      await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: json.token_hash,
      })
    ).error;
    if (sessionError) {
      sessionError = (
        await supabase.auth.verifyOtp({
          type: "email",
          token_hash: json.token_hash,
        })
      ).error;
    }
    setLoading(false);
    if (sessionError) {
      setError(sessionError.message);
      return;
    }
    router.push(typeof json.next === "string" ? json.next : "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md ledger-card p-8">
      <div className="mb-6">
        <BrandLogo href="/" markSize={34} />
      </div>
      <h1 className="font-serif text-3xl text-navy">Enter with your mobile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Owners, renters, and explorers sign in with an Indian mobile number. No
        email.
      </p>
      <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-xs text-teal-700">
        Your privacy is our top priority. Your number stays protected and is never
        shown publicly.
      </p>
      <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
        SMS is not connected yet. Use code <strong>{PUBLIC_DEV_PHONE_OTP}</strong>{" "}
        after requesting an OTP.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!sent ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <div className="flex gap-2">
              <span className="grid h-11 place-items-center rounded-lg border border-input px-3 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                id="phone"
                inputMode="numeric"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="98XXXXXXXX"
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
            {loading ? "Sending…" : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter the code sent to your mobile. Your number stays private.
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp">6-digit code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="h-11 tracking-[0.4em]"
            />
          </div>
          <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
            {loading ? "Verifying…" : "Login"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground"
            onClick={() => {
              setSent(false);
              setOtp("");
            }}
          >
            Change number
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Moderator?{" "}
        <Link href="/admin/login" className="text-teal-700 underline">
          Admin desk login
        </Link>
      </p>
    </div>
  );
}
