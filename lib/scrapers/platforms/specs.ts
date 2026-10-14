import type { OwnerPlatform } from "@/lib/types";

export type AreaQuery = {
  city: string;
  area: string;
};

export type PlatformSpec = {
  platform: OwnerPlatform;
  domain: string;
  searchQuery: (query: AreaQuery) => string;
  searchUrl: (query: AreaQuery) => string;
};

const CITY_SLUGS: Record<string, string> = {
  bengaluru: "bangalore",
  bangalore: "bangalore",
  mumbai: "mumbai",
  hyderabad: "hyderabad",
  "delhi ncr": "delhi",
  delhi: "delhi",
  chennai: "chennai",
  pune: "pune",
  kolkata: "kolkata",
  ahmedabad: "ahmedabad",
  kochi: "kochi",
  jaipur: "jaipur",
  chandigarh: "chandigarh",
  lucknow: "lucknow",
  indore: "indore",
  coimbatore: "coimbatore",
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function citySlug(city: string) {
  const key = city.trim().toLowerCase();
  return CITY_SLUGS[key] ?? slugify(city);
}

function nobrokerSearchUrl(query: AreaQuery) {
  return `https://www.nobroker.in/property/rent/${citySlug(query.city)}/${slugify(query.area)}`;
}

function magicbricksSearchUrl(query: AreaQuery) {
  const params = new URLSearchParams({
    proptype:
      "Multistorey-Apartment,Builder-Floor-Apartment,Penthouse,Studio-Apartment,Residential-House,Villa",
    cityName: query.city,
    Locality: query.area,
    category: "R",
  });
  return `https://www.magicbricks.com/property-for-rent/residential-real-estate?${params.toString()}`;
}

function mygateSearchUrl(query: AreaQuery) {
  const params = new URLSearchParams({
    q: `${query.area} ${query.city} owner rent`,
  });
  return `https://www.mygate.com/search?${params.toString()}`;
}

export const OWNER_PLATFORM_SPECS: Record<OwnerPlatform, PlatformSpec> = {
  NoBroker: {
    platform: "NoBroker",
    domain: "nobroker.in",
    searchQuery: (query) =>
      `site:nobroker.in "${query.area}" "${query.city}" owner rent apartment`,
    searchUrl: nobrokerSearchUrl,
  },
  MagicBricks: {
    platform: "MagicBricks",
    domain: "magicbricks.com",
    searchQuery: (query) =>
      `site:magicbricks.com "${query.area}" "${query.city}" owner rent apartment`,
    searchUrl: magicbricksSearchUrl,
  },
  MyGate: {
    platform: "MyGate",
    domain: "mygate.com",
    searchQuery: (query) =>
      `site:mygate.com "${query.area}" "${query.city}" rent apartment`,
    searchUrl: mygateSearchUrl,
  },
};

export const OWNER_PLATFORMS = Object.keys(
  OWNER_PLATFORM_SPECS
) as OwnerPlatform[];

export function listingFingerprint(input: {
  platform: string;
  url?: string | null;
  title: string;
  building_name?: string | null;
  monthly_rent?: number | null;
}) {
  const url = input.url?.split("#")[0]?.trim() ?? "";
  const basis = `${input.platform}|${url}|${input.title}|${input.building_name ?? ""}|${input.monthly_rent ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < basis.length; i += 1) {
    hash = (hash * 33) ^ basis.charCodeAt(i);
  }
  return `${input.platform}-${(hash >>> 0).toString(16)}-${basis.length}`;
}
