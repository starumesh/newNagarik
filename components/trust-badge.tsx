import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { isVerifiedTrust } from "@/lib/trust";

export function TrustBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  if (!isVerifiedTrust(score)) return null;
  return (
    <span className={cn("stamp-badge", className)} title="Rent data verified">
      <ShieldCheck className="size-3" />
      Verified
    </span>
  );
}

export function TrustScoreDisplay({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const verified = isVerifiedTrust(score);
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <p className="font-serif text-3xl text-navy">Trust score {score}</p>
      {verified ? <TrustBadge score={score} /> : null}
      {!verified ? (
        <p className="w-full text-xs text-muted-foreground">Under verification</p>
      ) : (
        <p className="w-full text-xs text-teal-700">
          Marked Verified — your rent data passed review.
        </p>
      )}
    </div>
  );
}
