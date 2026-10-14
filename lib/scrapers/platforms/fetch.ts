import { env } from "@/lib/env";
import { classifyPoster } from "@/lib/scrapers/platforms/owner";
import {
  listingFingerprint,
  OWNER_PLATFORM_SPECS,
  type AreaQuery,
} from "@/lib/scrapers/platforms/specs";
import type { AggregatorPost, OwnerPlatform } from "@/lib/types";

function asNumber(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function asString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeAreaItem(
  item: Record<string, unknown>,
  platform: OwnerPlatform,
  query: AreaQuery,
  index: number
): AggregatorPost {
  const spec = OWNER_PLATFORM_SPECS[platform];
  const rent = asNumber(item.rent, item.monthly_rent, item.price, item.rentAmount);
  const carpet = asNumber(item.carpet_area, item.area_sqft, item.superArea);
  const url =
    asString(item.url, item.link, item.sourceUrl) || spec.searchUrl(query);
  const title =
    asString(item.title, item.name, item.description) ||
    `Owner rental in ${query.area} via ${platform}`;
  const building = asString(
    item.building_name,
    item.society,
    item.building,
    item.localityName
  );
  const postedAt = asDate(
    item.posted_at ?? item.postedOn ?? item.date ?? item.publishedAt
  );
  const seen = new Date().toISOString();
  const externalId =
    asString(item.id, item.propertyId, item.external_id) ||
    listingFingerprint({
      platform,
      url,
      title,
      building_name: building,
      monthly_rent: rent,
    }) ||
    `${platform}-${index}`;

  return {
    id: `${platform}-${externalId}`,
    external_id: externalId,
    platform,
    title,
    building_name: building || `${query.area} residence`,
    city: asString(item.city) || query.city,
    area: asString(item.locality, item.area) || query.area,
    bhk: asNumber(item.bhk, item.bedrooms),
    monthly_rent: rent,
    furnishing: asString(item.furnishing) || null,
    url,
    rent_per_sqft: rent && carpet ? Math.round(rent / carpet) : null,
    posted_by: classifyPoster(item, platform),
    posted_at: postedAt,
    first_seen_at: postedAt ?? seen,
    last_seen_at: seen,
  };
}

export async function fetchApifyArea(
  query: AreaQuery,
  platform: OwnerPlatform
): Promise<AggregatorPost[]> {
  const actor = process.env.APIFY_RENT_ACTOR_ID;
  if (!env.apifyToken || !actor) return [];
  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${env.apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: query.city,
          locality: query.area,
          platform,
          postedBy: "owner",
          sortBy: "latest",
          maxItems: 20,
        }),
      }
    );
    if (!response.ok) return [];
    const items = (await response.json()) as Array<Record<string, unknown>>;
    return items
      .slice(0, 20)
      .map((item, index) => normalizeAreaItem(item, platform, query, index));
  } catch {
    return [];
  }
}

export async function fetchFirecrawlArea(
  query: AreaQuery,
  platform: OwnerPlatform
): Promise<AggregatorPost[]> {
  if (!env.firecrawlKey) return [];
  const spec = OWNER_PLATFORM_SPECS[platform];
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.firecrawlKey}`,
      },
      body: JSON.stringify({
        query: spec.searchQuery(query),
        limit: 10,
      }),
    });
    if (!response.ok) return [];
    const json = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    return (json.data ?? [])
      .filter((item) =>
        String(item.url ?? item.link ?? "")
          .toLowerCase()
          .includes(spec.domain)
      )
      .slice(0, 10)
      .map((item, index) => normalizeAreaItem(item, platform, query, index));
  } catch {
    return [];
  }
}

export async function fetchLiveAreaPosts(
  query: AreaQuery,
  platform: OwnerPlatform
): Promise<AggregatorPost[]> {
  const collected = [
    ...(await fetchApifyArea(query, platform)),
    ...(await fetchFirecrawlArea(query, platform)),
  ];
  const seen = new Set<string>();
  return collected.filter((post) => {
    if (seen.has(post.external_id)) return false;
    seen.add(post.external_id);
    return true;
  });
}
