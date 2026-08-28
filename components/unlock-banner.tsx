import Link from "next/link";
import { Lock } from "lucide-react";

export function UnlockBanner() {
  return (
    <div className="unlock-banner">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <p className="flex items-start gap-2 text-sm leading-relaxed">
          <Lock className="mt-0.5 size-4 shrink-0 text-teal" />
          Share your rent &amp; property details to unlock exact pricing for every
          building.
        </p>
        <Link
          href="/onboarding"
          className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Contribute data
        </Link>
      </div>
    </div>
  );
}
