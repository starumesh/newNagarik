import type { UserProfile } from "@/lib/types";

export const TRUST_THRESHOLD = 80;
export const HIGH_TRUST_BADGE = 90;

export function isRestricted(profile: UserProfile | null | undefined): boolean {
  if (!profile) return true;
  if (!profile.restricted_until) return false;
  return new Date(profile.restricted_until).getTime() > Date.now();
}

export function canAccessGranularData(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.role === "explorer") return false;
  if (isRestricted(profile)) return false;
  return profile.trust_score >= TRUST_THRESHOLD;
}

export function canShowTrustBadge(
  profile: UserProfile | null | undefined
): boolean {
  return Boolean(profile && profile.trust_score > HIGH_TRUST_BADGE);
}

export function accessLabel(profile: UserProfile | null | undefined): string {
  if (!profile) return "Signed out";
  if (isRestricted(profile) || profile.trust_score < TRUST_THRESHOLD) {
    return "Explorer mode";
  }
  if (profile.role === "explorer") return "Macro trends only";
  return "Verified contributor";
}
