import {
  citySlug,
  listingFingerprint,
  type AreaQuery,
} from "@/lib/scrapers/platforms/specs";
import { geocodeArea } from "@/lib/scrapers/web/geocode";
import { fetchJson } from "@/lib/scrapers/web/http";
import {
  matchesArea,
  parseBhk,
  parseEpoch,
  parseRentAmount,
  plausibleRent,
  postedWithinTwoWeeks,
} from "@/lib/scrapers/web/parse";
import type { AggregatorPost } from "@/lib/types";
import type { WebScrapeResult } from "@/lib/scrapers/web/types";

type NoBrokerItem = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string"
    ? value.replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim()
    : value == null
      ? ""
      : String(value);
}

function toPost(
  item: NoBrokerItem,
  query: AreaQuery,
  index: number,
  seen: string
): AggregatorPost | null {
  if (!asText(item.ownerId) && !asText(item.ownerName)) return null;

  const title = asText(item.propertyTitle || item.title).replace(/&#39;/g, "'");
  const locality = asText(item.locality);
  const society = asText(item.society);
  const nbLocality = asText(item.nbLocality);
  if (!matchesArea(query.area, title, locality, society, nbLocality)) {
    return null;
  }
  const rentIn = title.match(/for\s+rent\s+in\s+(.+)/i)?.[1] ?? "";
  if (
    rentIn &&
    !matchesArea(query.area, rentIn) &&
    !matchesArea(query.area, society)
  ) {
    return null;
  }

  const bhk = parseBhk(item.typeDesc) ?? parseBhk(item.type) ?? parseBhk(title);
  const monthly = parseRentAmount(item.rent);
  if (!plausibleRent(monthly, bhk)) return null;

  const postedAt =
    parseEpoch(item.creationDate) ??
    parseEpoch(item.activationDate) ??
    parseEpoch(item.dateOnly);
  if (!postedWithinTwoWeeks(postedAt)) return null;

  const size = Number(item.propertySize) || null;
  const path = asText(item.detailUrl);
  const url = path.startsWith("http")
    ? path
    : path
      ? `https://www.nobroker.in${path}`
      : null;
  if (!url) return null;

  const building =
    society && society.toLowerCase() !== "independent house"
      ? society
      : locality || query.area;
  const externalId =
    asText(item.id) ||
    listingFingerprint({
      platform: "NoBroker",
      url,
      title,
      building_name: building,
      monthly_rent: monthly,
    });

  return {
    id: `NoBroker-${externalId || index}`,
    external_id: externalId || `nb-${index}`,
    platform: "NoBroker",
    title: title || `${bhk ?? ""} BHK in ${query.area}`.trim(),
    building_name: building,
    city: query.city,
    area: query.area,
    bhk,
    monthly_rent: monthly,
    furnishing: item.furnishingDesc ? asText(item.furnishingDesc) : null,
    url,
    rent_per_sqft: monthly && size ? Math.round(monthly / size) : null,
    posted_by: "owner",
    posted_at: postedAt,
    first_seen_at: postedAt ?? seen,
    last_seen_at: seen,
  };
}

export async function scrapeNoBroker(
  query: AreaQuery,
  limit = 30
): Promise<WebScrapeResult> {
  const geo = await geocodeArea(query.city, query.area);
  if (!geo) return { posts: [], fetched: false };

  const searchParam = Buffer.from(
    JSON.stringify([
      {
        lat: geo.lat,
        lon: geo.lon,
        placeId: "",
        placeName: query.area,
      },
    ])
  ).toString("base64");

  const seen = new Date().toISOString();
  const posts: AggregatorPost[] = [];
  const seenIds = new Set<string>();

  for (let page = 1; page <= 4 && posts.length < limit; page += 1) {
    const params = new URLSearchParams({
      pageNo: String(page),
      searchParam,
      sharedAccomodation: "0",
      city: citySlug(query.city),
      orderBy: "creationDate,desc",
      radius: "2",
    });
    const json = await fetchJson<{ data?: NoBrokerItem[] }>(
      `https://www.nobroker.in/api/v3/multi/property/RENT/filter?${params.toString()}`,
      { Referer: "https://www.nobroker.in/", Origin: "https://www.nobroker.in" }
    );
    const items = json?.data ?? [];
    if (page === 1 && items.length === 0) return { posts: [], fetched: true };
    if (items.length === 0) break;

    for (let index = 0; index < items.length; index += 1) {
      const post = toPost(items[index]!, query, index + page * 30, seen);
      if (!post || seenIds.has(post.external_id)) continue;
      seenIds.add(post.external_id);
      posts.push(post);
      if (posts.length >= limit) break;
    }
  }

  posts.sort((a, b) => Date.parse(b.posted_at ?? "") - Date.parse(a.posted_at ?? ""));
  return { posts, fetched: true };
}
