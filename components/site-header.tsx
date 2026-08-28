import Link from "next/link";
import { Scale } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { TrustBadge } from "@/components/trust-badge";
import { canAccessGranularData } from "@/lib/access";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteHeader({
  profile,
  unread = 0,
}: {
  profile: UserProfile | null;
  unread?: number;
}) {
  const verified = canAccessGranularData(profile);

  return (
    <header className="sticky top-0 z-30 border-b border-navy/10 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={profile ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-navy text-cream">
            <Scale className="size-4" />
          </span>
          <span className="font-serif text-xl tracking-tight text-navy">
            RentSahih
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-navy/80 sm:flex">
          {profile ? (
            <>
              <Link href="/dashboard">Ledger</Link>
              <Link
                href="/search"
                className={cn(!verified && "pointer-events-none opacity-40")}
                aria-disabled={!verified}
              >
                Search
              </Link>
              <Link href="/inbox" className="relative">
                Inbox
                {unread > 0 ? (
                  <span className="absolute -right-3 -top-2 size-2 rounded-full bg-red-500" />
                ) : null}
              </Link>
              {profile.role === "owner" ? (
                <Link href="/listings/new">List</Link>
              ) : null}
            </>
          ) : (
            <>
              <Link href="/#how">How it works</Link>
              <Link href="/#trust">Trust engine</Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {profile ? <TrustBadge score={profile.trust_score} /> : null}
          {profile ? (
            <SignOutButton />
          ) : (
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4")}
            >
              Enter the ledger
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
