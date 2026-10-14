import { cacheGet, cacheSet } from "@/lib/redis";

export type GeoPoint = {
  lat: number;
  lon: number;
  label: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  display_name?: string;
  type?: string;
  class?: string;
};

const memory = new Map<string, GeoPoint>();

/** Prefer known locality centroids over Nominatim POIs (stations, malls). */
const KNOWN_AREAS: Record<string, { lat: number; lon: number }> = {
  whitefield: { lat: 12.9696365, lon: 77.7497448 },
  koramangala: { lat: 12.935223, lon: 77.624513 },
  "hsr layout": { lat: 12.912118, lon: 77.644554 },
  indiranagar: { lat: 12.978369, lon: 77.640836 },
  "electronic city": { lat: 12.845198, lon: 77.660172 },
  marathahalli: { lat: 12.959172, lon: 77.697419 },
  bellandur: { lat: 12.930427, lon: 77.678404 },
  "jp nagar": { lat: 12.906343, lon: 77.585682 },
  jayanagar: { lat: 12.925007, lon: 77.593803 },
  hebbal: { lat: 13.035807, lon: 77.597017 },
  yelahanka: { lat: 13.100698, lon: 77.596345 },
  "sarjapur road": { lat: 12.9171, lon: 77.6748 },
  bannerghatta: { lat: 12.889, lon: 77.597 },
  "banashankari": { lat: 12.925453, lon: 77.546757 },
};

function knownArea(city: string, area: string): GeoPoint | null {
  const areaKey = area.trim().toLowerCase().replace(/\s+/g, " ");
  const cityKey = city.trim().toLowerCase();
  const point =
    KNOWN_AREAS[`${cityKey}|${areaKey}`] ??
    (["bengaluru", "bangalore"].includes(cityKey) ? KNOWN_AREAS[areaKey] : undefined) ??
    KNOWN_AREAS[areaKey];
  if (!point) return null;
  return { lat: point.lat, lon: point.lon, label: `${area}, ${city}` };
}

function scoreHit(hit: NominatimHit, area: string) {
  const name = (hit.display_name ?? "").toLowerCase();
  const first = name.split(",")[0]?.trim() ?? "";
  const target = area.trim().toLowerCase();
  let score = 0;
  if (first === target) score += 8;
  else if (first.startsWith(target) && !first.includes("(")) score += 5;
  else if (name.includes(target)) score += 2;
  if (hit.class === "boundary" || hit.type === "administrative") score += 6;
  if (["suburb", "neighbourhood", "quarter", "residential"].includes(hit.type ?? "")) {
    score += 4;
  }
  if (hit.class === "railway" || ["station", "halt", "bus_stop"].includes(hit.type ?? "")) {
    score -= 8;
  }
  if (hit.class === "highway") score -= 3;
  return score;
}

export async function geocodeArea(
  city: string,
  area: string
): Promise<GeoPoint | null> {
  const key = `geo:v3:${city}:${area}`.toLowerCase();
  const cached = memory.get(key) ?? (await cacheGet<GeoPoint>(key));
  if (cached) {
    memory.set(key, cached);
    return cached;
  }

  const known = knownArea(city, area);
  if (known) {
    memory.set(key, known);
    await cacheSet(key, known, 60 * 60 * 24 * 14);
    return known;
  }

  const query = `${area}, ${city}, India`;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
  }).toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NewNagarikAdmin/1.0 (rental transparency desk)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const rows = ((await response.json()) as NominatimHit[]) ?? [];
    const ranked = [...rows].sort(
      (a, b) => scoreHit(b, area) - scoreHit(a, area)
    );
    const row = ranked[0];
    if (!row) return null;
    const point: GeoPoint = {
      lat: Number(row.lat),
      lon: Number(row.lon),
      label: row.display_name ?? query,
    };
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
    memory.set(key, point);
    await cacheSet(key, point, 60 * 60 * 24 * 14);
    return point;
  } catch {
    return null;
  }
}
