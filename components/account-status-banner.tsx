import { Shield } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { isRestricted } from "@/lib/access";

export function AccountStatusBanner({ profile }: { profile: UserProfile }) {
  if (!isRestricted(profile)) return null;

  const until = profile.restricted_until
    ? new Date(profile.restricted_until).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="mb-6 rounded-2xl border border-teal/25 bg-accent/70 px-4 py-3 text-sm text-navy">
      <p className="flex items-start gap-2">
        <Shield className="mt-0.5 size-4 shrink-0 text-teal-700" />
        <span>
          Your account is currently limited while we review recent activity.
          Place search and some tools are paused for now
          {until ? ` (until ${until})` : ""}. Thank you for your patience — our
          team is here if you need help.
        </span>
      </p>
    </div>
  );
}
