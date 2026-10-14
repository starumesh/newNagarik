"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { TrustBadge } from "@/components/trust-badge";
import { canAccessSearch } from "@/lib/access";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  if (disabled) {
    return (
      <span
        className="cursor-not-allowed text-navy/30"
        title="Finish onboarding as an owner or renter to search places"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "transition-colors hover:text-navy",
        active ? "font-semibold text-navy" : "text-navy/70"
      )}
    >
      {children}
    </Link>
  );
}

export function SiteHeader({
  profile,
  unread = 0,
}: {
  profile: UserProfile | null;
  unread?: number;
}) {
  const canSearch = canAccessSearch(profile);

  return (
    <header className="sticky top-0 z-30 border-b border-navy/10 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <BrandLogo href={profile ? "/dashboard" : "/"} markSize={34} />
        <nav className="flex flex-1 items-center justify-end gap-4 text-sm sm:gap-6">
          {profile ? (
            <>
              <NavLink href="/dashboard">Home</NavLink>
              <NavLink href="/search" disabled={!canSearch}>
                Search
              </NavLink>
              <NavLink href="/inbox">
                <span className="relative inline-flex items-center gap-1">
                  Inbox
                  {unread > 0 ? (
                    <span className="size-1.5 rounded-full bg-red-500" aria-hidden />
                  ) : null}
                </span>
              </NavLink>
              {profile.role === "owner" ? (
                <NavLink href="/listings/new">Post listing</NavLink>
              ) : null}
              <TrustBadge score={profile.trust_score} className="hidden sm:inline-flex" />
              <SignOutButton />
            </>
          ) : (
            <>
              <NavLink href="/#how">How it works</NavLink>
              <NavLink href="/#trust">How rents stay honest</NavLink>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4")}
              >
                Explore properties
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
