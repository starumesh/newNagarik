import Link from "next/link";
import { Lock } from "lucide-react";

export function UnlockBanner() {
  return (
    <div className="unlock-banner">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <p className="flex items-start gap-2 text-sm leading-relaxed">
          <Lock className="mt-0.5 size-4 shrink-0 text-teal" />
          Unlock what you only learn after living somewhere — real rents,
          maintenance, and society realities for every building.
        </p>
        <Link
          href="/reviews/new"
          className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Add rental review
        </Link>
      </div>
    </div>
  );
}
