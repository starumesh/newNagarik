import { TrustBadge } from "@/components/trust-badge";
import { formatINR } from "@/lib/format";
import type { PropertyListing, UserProfile } from "@/lib/types";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VerifiedDashboard({
  profile,
  city,
  listings,
}: {
  profile: UserProfile;
  city: string | null;
  listings: PropertyListing[];
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Unlocked ledger
          </p>
          <h1 className="mt-2 font-serif text-4xl text-navy">
            {city ?? "Your city"} is now specific.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Search any society. Read avg / median / min / max. Write to owners
            without exposing your identity in email.
          </p>
        </div>
        <TrustBadge score={profile.trust_score} />
      </div>
      <section className="ledger-card p-6">
        <p className="text-sm text-muted-foreground">Your access tier</p>
        <p className="mt-1 font-serif text-3xl text-navy">
          Trust score {profile.trust_score}
        </p>
        <p className="mt-2 text-sm">
          Role: {profile.role} · Search, filters, and inquiry relay are on.
        </p>
        <Link
          href="/search"
          className={cn(buttonVariants(), "mt-5 rounded-full")}
        >
          Search a building
        </Link>
      </section>
      {profile.role === "owner" ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-2xl text-navy">Your listings</h2>
            <Link href="/listings/new" className="text-sm text-teal-700">
              Add another
            </Link>
          </div>
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <div className="grid gap-3">
              {listings.map((listing) => (
                <article key={listing.id} className="ledger-card p-4">
                  <p className="font-serif text-xl text-navy">
                    {listing.locations?.building_name ?? "Listing"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {listing.bhk} BHK · asking {formatINR(listing.asking_rent)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
