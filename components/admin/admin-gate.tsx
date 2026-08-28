"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const router = useRouter();

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (!response.ok) {
      toast.error("Invalid admin secret.");
      return;
    }
    setUnlocked(true);
    router.refresh();
  }

  if (!unlocked) {
    return (
      <form onSubmit={unlock} className="mx-auto max-w-md ledger-card space-y-4 p-8">
        <h1 className="font-serif text-3xl text-navy">Moderator key</h1>
        <p className="text-sm text-muted-foreground">
          Protected by <code>ADMIN_SECRET</code>. This is an MVP gate, not SSO.
        </p>
        <div className="space-y-2">
          <Label htmlFor="secret">Secret</Label>
          <Input
            id="secret"
            type="password"
            className="h-11"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full rounded-full">
          Enter review room
        </Button>
      </form>
    );
  }

  return <>{children}</>;
}
