import {
  listingFingerprint,
  OWNER_PLATFORM_SPECS,
  type AreaQuery,
} from "@/lib/scrapers/platforms/specs";
import { decodeEntities, fetchText, stripTags } from "@/lib/scrapers/web/http";
import {
  matchesArea,
  parseBhk,
  parseEpoch,
  parseIndianRent,
  parsePostedLabel,
  parseRentAmount,
  parseSqft,
  plausibleRent,
  postedWithinTwoWeeks,
} from "@/lib/scrapers/web/parse";
import type { AggregatorPost } from "@/lib/types";
import type { WebScrapeResult } from "@/lib/scrapers/web/types";

const MB_CITY: Record<string, string> = {
  bengaluru: "Bangalore",
  bangalore: "Bangalore",
  mumbai: "Mumbai",
  hyderabad: "Hyderabad",
  chennai: "Chennai",
  pune: "Pune",
  kolkata: "Kolkata",
  ahmedabad: "Ahmedabad",
  "delhi ncr": "New Delhi",
  delhi: "New Delhi",
  gurgaon: "Gurgaon",
  gurugram: "Gurgaon",
  noida: "Noida",
  kochi: "Kochi",
  jaipur: "Jaipur",
  chandigarh: "Chandigarh",
  lucknow: "Lucknow",
  indore: "Indore",
  coimbatore: "Coimbatore",
};

function magicbricksCity(city: string) {
  return MB_CITY[city.trim().toLowerCase()] ?? city;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function extractPreloadedState(html: string): Record<string, unknown>[] {
  const marker = "window.SERVER_PRELOADED_STATE_ = ";
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const jsonStart = start + marker.length;
  const scriptEnd = html.indexOf("</script>", jsonStart);
  if (scriptEnd < 0) return [];
  let raw = html.slice(jsonStart, scriptEnd).trim();
  if (raw.endsWith(";")) raw = raw.slice(0, -1);
  try {
    const state = JSON.parse(raw) as { searchResult?: Record<string, unknown>[] };
    return Array.isArray(state.searchResult) ? state.searchResult : [];
  } catch {
    return [];
  }
}

function listingUrl(item: Record<string, unknown>) {
  const path = asText(item.url);
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://www.magicbricks.com/propertyDetails/${path}`;
}

function fromJsonItem(
  item: Record<string, unknown>,
  query: AreaQuery,
  seen: string
): AggregatorPost | null {
  const userType = asText(item.userType);
  if (!/^owner$/i.test(userType)) return null;

  const title = asText(item.propertyTitle);
  const locality = asText(item.locSeoName);
  const society = asText(item.prjname);
  const href = listingUrl(item);
  if (!matchesArea(query.area, title, locality, society, href)) {
    return null;
  }

  const postedAt =
    parseEpoch(item.postDateT) ?? parsePostedLabel(asText(item.postedLabelD), Date.now());
  if (!postedWithinTwoWeeks(postedAt)) return null;

  const rent = parseRentAmount(item.price) ?? parseIndianRent(asText(item.priceD));
  const bhk = parseBhk(item.bedroomD) ?? parseBhk(title);
  if (!plausibleRent(rent, bhk)) return null;
  if (!title || !href) return null;

  const sqft =
    Number(item.carpetArea) ||
    Number(item.coveredArea) ||
    parseSqft(asText(item.coveredArea)) ||
    null;
  const propertyId = asText(item.id) || listingFingerprint({
    platform: "MagicBricks",
    url: href,
    title,
    building_name: society || query.area,
    monthly_rent: rent,
  });

  return {
    id: `MagicBricks-${propertyId}`,
    external_id: propertyId,
    platform: "MagicBricks",
    title,
    building_name: society || locality || query.area,
    city: query.city,
    area: query.area,
    bhk,
    monthly_rent: rent,
    furnishing: asText(item.furnishedD) || null,
    url: href,
    rent_per_sqft: rent && sqft ? Math.round(rent / sqft) : null,
    posted_by: "owner",
    posted_at: postedAt,
    first_seen_at: postedAt ?? seen,
    last_seen_at: seen,
  };
}

function summaryMap(chunk: string) {
  const labels = Array.from(
    chunk.matchAll(/mb-srp__card__summary--label[^>]*>([\s\S]*?)<\/div>/g)
  ).map((match) => stripTags(match[1] ?? ""));
  const values = Array.from(
    chunk.matchAll(/mb-srp__card__summary--value[^>]*>([\s\S]*?)<\/div>/g)
  ).map((match) => stripTags(match[1] ?? ""));
  const map = new Map<string, string>();
  labels.forEach((label, index) => {
    if (label) map.set(label.toLowerCase(), values[index] ?? "");
  });
  return map;
}

function fromHtmlChunk(chunk: string, query: AreaQuery, seen: string): AggregatorPost | null {
  const advertiser = stripTags(
    chunk.match(/mb-srp__card__ads--name[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ""
  );
  if (!/^owner\b/i.test(advertiser)) return null;

  const title =
    stripTags(
      chunk.match(/<h2 class="mb-srp__card--title"[^>]*title="([^"]+)"/)?.[1] ??
        chunk.match(/<h2 class="mb-srp__card--title"[^>]*>([\s\S]*?)<\/h2>/)?.[1] ??
        ""
    ) || "";
  if (!title) return null;
  if (!matchesArea(query.area, title, advertiser, chunk.slice(0, 1200))) return null;

  const postedLabel = stripTags(
    chunk.match(/mb-srp__card__photo__fig--post">([\s\S]*?)<\/div>/)?.[1] ?? ""
  );
  const postedAt = parsePostedLabel(postedLabel, Date.now());
  if (!postedWithinTwoWeeks(postedAt)) return null;

  const priceHtml =
    chunk.match(/mb-srp__card__price--amount[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "";
  const rent = parseIndianRent(priceHtml);
  const bhk = parseBhk(title);
  if (!plausibleRent(rent, bhk)) return null;

  const summary = summaryMap(chunk);
  const furnishing = summary.get("furnishing") || null;
  const areaText = summary.get("carpet area") || summary.get("super area") || "";
  const sqft = parseSqft(areaText);

  const href = decodeEntities(
    chunk.match(/href="(\/propertyDetails\/[^"]+)"/)?.[1] ??
      chunk.match(/href="(https:\/\/www\.magicbricks\.com\/[^"]*id=[^"]+)"/)?.[1] ??
      ""
  );
  const listingHref = href
    ? href.startsWith("http")
      ? href
      : `https://www.magicbricks.com${href}`
    : null;
  if (!listingHref) return null;

  const building =
    stripTags(
      chunk.match(/mb-srp__card__society--name[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? ""
    ) || query.area;
  const propertyId =
    chunk.match(/id="propertiesAction(\d+)"/)?.[1] ||
    listingFingerprint({
      platform: "MagicBricks",
      url: listingHref,
      title,
      building_name: building,
      monthly_rent: rent,
    });

  return {
    id: `MagicBricks-${propertyId}`,
    external_id: propertyId,
    platform: "MagicBricks",
    title,
    building_name: building,
    city: query.city,
    area: query.area,
    bhk,
    monthly_rent: rent,
    furnishing,
    url: listingHref,
    rent_per_sqft: rent && sqft ? Math.round(rent / sqft) : null,
    posted_by: "owner",
    posted_at: postedAt,
    first_seen_at: postedAt ?? seen,
    last_seen_at: seen,
  };
}

export async function scrapeMagicBricks(
  query: AreaQuery,
  limit = 30
): Promise<WebScrapeResult> {
  const search = new URL(
    OWNER_PLATFORM_SPECS.MagicBricks.searchUrl({
      city: magicbricksCity(query.city),
      area: query.area,
    })
  );
  search.searchParams.set("postedBy", "Owner");
  const html = await fetchText(search.toString(), {
    Referer: "https://www.magicbricks.com/",
  });
  if (!html) return { posts: [], fetched: false };

  const seen = new Date().toISOString();
  const posts: AggregatorPost[] = [];
  const seenIds = new Set<string>();

  const jsonItems = extractPreloadedState(html);
  const sourceItems =
    jsonItems.length > 0
      ? jsonItems
          .map((item) => fromJsonItem(item, query, seen))
          .filter((post): post is AggregatorPost => Boolean(post))
      : html
          .split(/<div class="mb-srp__list" id="cardid\d+">/)
          .slice(1)
          .map((chunk) => fromHtmlChunk(chunk, query, seen))
          .filter((post): post is AggregatorPost => Boolean(post));

  for (const post of sourceItems) {
    if (seenIds.has(post.external_id)) continue;
    seenIds.add(post.external_id);
    posts.push(post);
    if (posts.length >= limit) break;
  }

  posts.sort((a, b) => Date.parse(b.posted_at ?? "") - Date.parse(a.posted_at ?? ""));
  return { posts, fetched: true };
}
