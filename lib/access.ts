import type { UserProfile } from "@/lib/types";
import { isVerifiedTrust } from "@/lib/trust";

export const TRUST_THRESHOLD = 80;

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

/** Place/community search: onboarded owners/renters can look up societies; verified stats still require approval. */
export function canAccessSearch(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile) return false;
  if (isRestricted(profile)) return false;
  if (!profile.onboarding_completed) return false;
  if (profile.role === "explorer") return false;
  return profile.role === "owner" || profile.role === "renter";
}

export function canShowTrustBadge(
  profile: UserProfile | null | undefined
): boolean {
  return Boolean(profile && isVerifiedTrust(profile.trust_score));
}

export function accessLabel(profile: UserProfile | null | undefined): string {
  if (!profile) return "Signed out";
  if (isRestricted(profile)) {
    return "Account under review";
  }
  if (isVerifiedTrust(profile.trust_score)) {
    return "Verified contributor";
  }
  if (profile.trust_score < TRUST_THRESHOLD) {
    return "Pending verification";
  }
  if (profile.role === "explorer") return "Macro trends only";
  return "Contributor";
}
