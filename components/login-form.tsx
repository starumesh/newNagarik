"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Add Supabase keys to .env.local first.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Check your email for a 6-digit code.");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md ledger-card p-8">
      <Link href="/" className="mb-6 flex items-center gap-2 text-navy">
        <Scale className="size-5" />
        <span className="font-serif text-xl">RentSahih</span>
      </Link>
      <h1 className="font-serif text-3xl text-navy">Enter the ledger</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Email OTP only. We hash identifiers for fraud checks and never publish
        them.
      </p>
      {!sent ? (
        <form onSubmit={sendOtp} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
            {loading ? "Sending…" : "Send one-time code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
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
            {loading ? "Verifying…" : "Continue"}
          </Button>
        </form>
      )}
    </div>
  );
}
