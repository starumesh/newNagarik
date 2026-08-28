import { cacheGet, cacheSet } from "@/lib/redis";
import { filterVagueAds } from "@/lib/scrapers/filter";
import {
  demoListings,
  fetchFromConfiguredProviders,
} from "@/lib/scrapers/providers";
import type { ExternalListing } from "@/lib/types";

type Query = {
  city: string;
  area: string;
  building_name: string;
};

const CACHE_TTL = 60 * 60 * 24;

export async function getExternalListings(
  query: Query
): Promise<{ listings: ExternalListing[]; source: "cache" | "live" | "none" }> {
  const key = `ext:${query.city}:${query.area}:${query.building_name}`.toLowerCase();
  const cached = await cacheGet<ExternalListing[]>(key);
  if (cached && cached.length > 0) {
    return { listings: cached, source: "cache" };
  }

  try {
    const live = filterVagueAds(await fetchFromConfiguredProviders(query));
    if (live.length > 0) {
      await cacheSet(key, live, CACHE_TTL);
      return { listings: live.slice(0, 15), source: "live" };
    }
  } catch {
    // Swallow scraper failures; the UI shows a calm empty state.
  }

  if (process.env.DEMO_EXTERNAL_LISTINGS === "true") {
    const demo = filterVagueAds(demoListings(query)).slice(0, 15);
    await cacheSet(key, demo, CACHE_TTL);
    return { listings: demo, source: "live" };
  }

  return { listings: [], source: "none" };
}

export async function getScrapedAveragePsf(query: Query): Promise<number | null> {
  const { listings } = await getExternalListings(query);
  const values = listings
    .map((listing) => listing.rent_per_sqft)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
