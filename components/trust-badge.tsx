import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrustBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  if (score <= 90) return null;
  return (
    <span className={cn("stamp-badge", className)}>
      <ShieldCheck className="size-3" />
      Verified Contributor
    </span>
  );
}
