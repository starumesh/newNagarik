import Link from "next/link";
import { formatINR } from "@/lib/format";
import type { RentEntry } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function statusLabel(status: RentEntry["verification_status"]) {
  if (status === "auto_approved") return "Verified";
  if (status === "rejected") return "Needs changes";
  return "Pending review";
}

export function RenterReviewsSection({ reviews }: { reviews: RentEntry[] }) {
  const earliestId = reviews[0]?.id;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-navy">Your rental reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit a past review or add another building you’ve lived in.
          </p>
        </div>
        <Link
          href="/reviews/new"
          className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
        >
          Submit another review
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className="ledger-card p-5">
          <p className="text-sm text-muted-foreground">
            No rental reviews yet. Add one for the home you currently rent.
          </p>
          <Link
            href="/reviews/new"
            className={cn(buttonVariants(), "mt-4 rounded-full")}
          >
            Add rental review
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {reviews.map((entry) => {
            const isOnboarding = entry.id === earliestId;
            return (
              <article
                key={entry.id}
                className="ledger-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-serif text-xl text-navy">
                    {entry.locations?.building_name ?? "Building"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.locations?.area}
                    {entry.locations?.city ? ` · ${entry.locations.city}` : ""}
                    {" · "}
                    {entry.bhk} BHK · {formatINR(entry.monthly_rent)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusLabel(entry.verification_status)}
                    {isOnboarding ? " · From onboarding" : ""}
                  </p>
                </div>
                <Link
                  href={`/reviews/${entry.id}/edit`}
                  className="text-sm font-medium text-teal-700"
                >
                  Edit
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
