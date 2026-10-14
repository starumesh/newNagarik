import type { Purpose, UserRole, VerificationStatus } from "@/lib/types";

/** Score while a rental review is waiting on admin review. */
export const PENDING_TRUST_SCORE = 50;

/** Verified rent data is the only path to 100. */
export const VERIFIED_TRUST_SCORE = 100;

const ROLE_BASE: Record<UserRole, number> = {
  explorer: 40,
  owner: 60,
  renter: PENDING_TRUST_SCORE,
};

export type TrustInput = {
  role: UserRole;
  purpose?: Purpose | null;
  /** Rent entry verification — only renters reach 100 when approved. */
  verificationStatus?: VerificationStatus | "blocked" | null;
};

export type TrustBreakdown = {
  base: number;
  intention: number;
  verified: boolean;
  score: number;
};

export function hasIntention(purpose?: Purpose | null): boolean {
  return Boolean(purpose);
}

/**
 * Trust model:
 * - Renter before verification: always 50 (under verify)
 * - Renter after admin approval: 100 + Verified mark
 * - Owner: 60 (listing access; not a verified-rent badge)
 * - Explorer: 40 (macro trends only)
 */
export function computeTrustBreakdown(input: TrustInput): TrustBreakdown {
  const verified =
    input.role === "renter" && input.verificationStatus === "auto_approved";

  if (verified) {
    return {
      base: ROLE_BASE.renter,
      intention: 0,
      verified: true,
      score: VERIFIED_TRUST_SCORE,
    };
  }

  if (input.role === "renter") {
    return {
      base: PENDING_TRUST_SCORE,
      intention: 0,
      verified: false,
      score: PENDING_TRUST_SCORE,
    };
  }

  return {
    base: ROLE_BASE[input.role],
    intention: 0,
    verified: false,
    score: ROLE_BASE[input.role],
  };
}

export function computeTrustScore(input: TrustInput): number {
  return computeTrustBreakdown(input).score;
}

export function isVerifiedTrust(score: number): boolean {
  return score >= VERIFIED_TRUST_SCORE;
}
