import type { AggregatorPlatform, ExternalListing } from "@/lib/types";
import { env } from "@/lib/env";

type Query = {
  city: string;
  area: string;
  building_name: string;
};

const PLATFORMS: AggregatorPlatform[] = [
  "NoBroker",
  "99acres",
  "MyGate",
  "MagicBricks",
  "Anacity",
];

export async function fetchFromConfiguredProviders(
  query: Query
): Promise<ExternalListing[]> {
  const listings: ExternalListing[] = [];

  if (env.apifyToken) {
    listings.push(...(await fetchApify(query)));
  }
  if (env.firecrawlKey) {
    listings.push(...(await fetchFirecrawl(query)));
  }

  return listings;
}

async function fetchApify(query: Query): Promise<ExternalListing[]> {
  try {
    const actor = process.env.APIFY_RENT_ACTOR_ID;
    if (!actor) return [];
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${env.apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: query.city,
          locality: query.area,
          building: query.building_name,
          maxItems: 15,
        }),
      }
    );
    if (!response.ok) return [];
    const items = (await response.json()) as Array<Record<string, unknown>>;
    return items.slice(0, 15).map((item, index) => normalize(item, index, "Apify"));
  } catch {
    return [];
  }
}

async function fetchFirecrawl(query: Query): Promise<ExternalListing[]> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.firecrawlKey}`,
      },
      body: JSON.stringify({
        query: `${query.building_name} ${query.area} ${query.city} rent apartment`,
        limit: 8,
      }),
    });
    if (!response.ok) return [];
    const json = (await response.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    return (json.data ?? []).slice(0, 8).map((item, index) =>
      normalize(item, index, "Firecrawl")
    );
  } catch {
    return [];
  }
}

function normalize(
  item: Record<string, unknown>,
  index: number,
  source: string
): ExternalListing {
  const platform = (PLATFORMS.find((name) =>
    String(item.platform ?? item.source ?? source).includes(name)
  ) ?? "NoBroker") as AggregatorPlatform;

  const rent = Number(item.rent ?? item.monthly_rent ?? item.price ?? 0) || null;
  const area = Number(item.carpet_area ?? item.area_sqft ?? 0) || null;

  return {
    id: String(item.id ?? `${platform}-${index}`),
    platform,
    title: String(item.title ?? item.name ?? `${querySafe(item)} listing`),
    building_name: String(
      item.building_name ?? item.society ?? item.building ?? ""
    ),
    city: String(item.city ?? ""),
    area: String(item.locality ?? item.area ?? ""),
    bhk: item.bhk ? Number(item.bhk) : null,
    monthly_rent: rent,
    furnishing: item.furnishing ? String(item.furnishing) : null,
    url: item.url ? String(item.url) : null,
    rent_per_sqft: rent && area ? Math.round(rent / area) : null,
  };
}

function querySafe(item: Record<string, unknown>) {
  return String(item.building_name ?? item.society ?? "External");
}

export function demoListings(query: Query): ExternalListing[] {
  const rent = 35000 + query.building_name.length * 120;
  return PLATFORMS.map((platform, index) => ({
    id: `demo-${platform}-${index}`,
    platform,
    title: `${query.building_name} · 2 BHK via ${platform}`,
    building_name: query.building_name,
    city: query.city,
    area: query.area,
    bhk: 2,
    monthly_rent: rent + index * 1500,
    furnishing: index % 2 === 0 ? "semi" : "fully",
    url: null,
    rent_per_sqft: Math.round((rent + index * 1500) / 1100),
  }));
}
