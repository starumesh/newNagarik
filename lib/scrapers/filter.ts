import type { ExternalListing } from "@/lib/types";

const LANDMARK_ONLY =
  /\b(near|opp\.?|opposite|behind|beside|close to|walking distance|metro station|railway station|bus stop)\b/i;

const HAS_BUILDING_HINT =
  /\b(apartment|apartments|residency|society|towers?|enclave|heights|park|villa|homes?|complex|township|phase|block|wing)\b/i;

export function isVagueAd(listing: {
  title?: string | null;
  building_name?: string | null;
  area?: string | null;
}): boolean {
  const building = listing.building_name?.trim() ?? "";
  const title = listing.title?.trim() ?? "";
  const haystack = `${building} ${title}`;

  if (building.length < 4) return true;
  if (/^\d+$/.test(building)) return true;
  if (LANDMARK_ONLY.test(building) && !HAS_BUILDING_HINT.test(building)) {
    return true;
  }
  if (LANDMARK_ONLY.test(haystack) && building.length < 8 && !HAS_BUILDING_HINT.test(haystack)) {
    return true;
  }
  const generic = ["flat for rent", "house for rent", "apartment for rent", "pg", "studio"];
  if (generic.includes(building.toLowerCase())) return true;
  return false;
}

export function filterVagueAds(listings: ExternalListing[]): ExternalListing[] {
  return listings.filter((listing) => !isVagueAd(listing));
}
