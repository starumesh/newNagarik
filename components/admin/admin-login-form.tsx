"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    const prepared = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await prepared.json();
    if (!prepared.ok) {
      setLoading(false);
      setError(json.error ?? "Could not sign in.");
      return;
    }

    const signInEmail = typeof json.email === "string" ? json.email : email;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.refresh();
    window.location.assign("/admin/verification");
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121a2a] p-8 text-cream shadow-ledger">
      <div className="mb-6">
        <BrandLogo
          href={null}
          markSize={34}
          wordmarkClassName="text-cream"
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">
        Moderation desk
      </p>
      <h1 className="mt-2 font-serif text-3xl text-cream">Admin sign in</h1>
      <p className="mt-2 text-sm text-slate-400">
        Password only. This desk is separate from renter and owner mobile login.
      </p>
      {error ? (
        <p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-slate-300">
            Email
          </Label>
          <Input
            id="admin-email"
            type="email"
            required
            value={email}
            placeholder={defaultEmail || "admin@newnagarik.local"}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 border-white/15 bg-navy-950 text-cream"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password" className="text-slate-300">
            Password
          </Label>
          <Input
            id="admin-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 border-white/15 bg-navy-950 text-cream"
          />
        </div>
        <Button type="submit" className="h-11 w-full rounded-full bg-brass text-navy hover:bg-brass/90" disabled={loading}>
          {loading ? "Signing in…" : "Open the desk"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">
        <Link href="/login" className="underline">
          User mobile login
        </Link>
      </p>
    </div>
  );
}
