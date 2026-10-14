"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/verification", label: "Rental reviews", match: "/verification" },
  { href: "/admin/listings", label: "Owner listings", match: "/listings" },
  { href: "/admin/places", label: "Places", match: "/places" },
];

export function AdminShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    void fetch("/api/admin/aggregator/alerts?unread=1")
      .then(async (response) => {
        if (!response.ok) return;
        const json = await response.json();
        setUnread(json.unreadCount ?? 0);
      })
      .catch(() => undefined);
  }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-white/10 bg-[#0b1220] px-5 py-6 lg:border-b-0 lg:border-r">
          <BrandLogo
            href="/admin/verification"
            markSize={30}
            wordmarkClassName="text-lg text-cream"
          />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-brass">
            Moderation desk
          </p>
          <p className="mt-6 font-serif text-2xl text-cream">Queue</p>
          <nav className="mt-8 space-y-1 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2",
                  pathname?.includes(link.match)
                    ? "bg-brass/20 text-brass"
                    : "text-slate-400 hover:bg-white/5"
                )}
              >
                {link.label}
                {link.match === "/listings" && unread > 0 ? (
                  <span className="rounded-full bg-brass px-1.5 text-[10px] font-semibold text-navy">
                    {unread}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="mt-10 text-xs text-slate-500">
            <p className="truncate">{email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 px-0 text-slate-400"
              onClick={() => void signOut()}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </aside>
        <div className="px-4 py-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}
