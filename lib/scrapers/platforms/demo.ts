import { env } from "@/lib/env";
import { listingFingerprint, type AreaQuery } from "@/lib/scrapers/platforms/specs";
import { OWNER_PLATFORM_SPECS } from "@/lib/scrapers/platforms/specs";
import type { AggregatorPost, OwnerPlatform } from "@/lib/types";

const BUILDINGS = [
  "Prestige Park",
  "Sobha Meadows",
  "Brigade Gateway",
  "Purva Venezia",
  "Salarpuria Sattva",
  "My Home Bhooja",
  "DLF Crest",
  "Hiranandani Gardens",
];

export function allowDemoAreaFeed() {
  if (process.env.DEMO_EXTERNAL_LISTINGS === "true") return true;
  return (
    process.env.NODE_ENV !== "production" &&
    !env.apifyToken &&
    !env.firecrawlKey
  );
}

export function demoAreaPosts(
  query: AreaQuery,
  platform: OwnerPlatform,
  count = 3
): AggregatorPost[] {
  const spec = OWNER_PLATFORM_SPECS[platform];
  const searchUrl = spec.searchUrl(query);
  const now = Date.now();

  return Array.from({ length: count }, (_, index) => {
    const rent = 22000 + query.area.length * 180 + index * 2500;
    const bhk = (index % 3) + 1;
    const building = BUILDINGS[(index + query.area.length) % BUILDINGS.length]!;
    const title = `${bhk} BHK in ${building}, ${query.area} · owner`;
    const postedAt = new Date(now - index * 3 * 60 * 60 * 1000).toISOString();
    const url = `${searchUrl}${searchUrl.includes("?") ? "&" : "?"}listing=${encodeURIComponent(`${platform}-${index}`)}`;
    const externalId = listingFingerprint({
      platform,
      url,
      title,
      building_name: building,
      monthly_rent: rent,
    });

    return {
      id: `demo-${platform}-${externalId}`,
      external_id: externalId,
      platform,
      title,
      building_name: building,
      city: query.city,
      area: query.area,
      bhk,
      monthly_rent: rent,
      furnishing: index % 2 === 0 ? "semi" : "fully",
      url,
      rent_per_sqft: Math.round(rent / (650 + bhk * 180)),
      posted_by: "owner" as const,
      posted_at: postedAt,
      first_seen_at: postedAt,
      last_seen_at: new Date().toISOString(),
    };
  });
}
