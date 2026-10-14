import type { SupabaseClient } from "@supabase/supabase-js";
import { CITIES, CITY_AREAS } from "@/lib/data/cities";

export type CatalogCity = {
  id?: string;
  name: string;
  is_enabled: boolean;
};

export type CatalogArea = {
  id?: string;
  city: string;
  name: string;
  kind: "area" | "society" | "community";
  is_enabled: boolean;
};

export type CatalogBuilding = {
  id: string;
  city: string;
  area: string;
  building_name: string;
  kind: "building" | "society" | "community";
  is_enabled: boolean;
};

export function tableMissing(message?: string) {
  return Boolean(
    message &&
      (/does not exist|schema cache|could not find the table/i.test(message) ||
        /relation .* does not exist/i.test(message))
  );
}

export function columnMissing(message?: string) {
  return Boolean(message && /column|schema cache|does not exist/i.test(message));
}

export async function seedCatalogIfEmpty(admin: SupabaseClient) {
  const { count: cityCount, error: cityProbe } = await admin
    .from("catalog_cities")
    .select("id", { count: "exact", head: true });
  if (cityProbe) {
    return {
      ok: false as const,
      missing: tableMissing(cityProbe.message),
      error: cityProbe.message,
    };
  }

  if ((cityCount ?? 0) === 0) {
    const { error: cityError } = await admin
      .from("catalog_cities")
      .insert([...CITIES].map((name) => ({ name, is_enabled: true })));
    if (cityError && !/duplicate|unique/i.test(cityError.message)) {
      return { ok: false as const, missing: false, error: cityError.message };
    }
  }

  const { count: areaCount, error: areaProbe } = await admin
    .from("catalog_areas")
    .select("id", { count: "exact", head: true });
  if (areaProbe) {
    return {
      ok: false as const,
      missing: tableMissing(areaProbe.message),
      error: areaProbe.message,
    };
  }

  if ((areaCount ?? 0) === 0) {
    const areaRows = Object.entries(CITY_AREAS).flatMap(([city, areas]) =>
      areas.map((name) => ({
        city,
        name,
        kind: "area" as const,
        is_enabled: true,
      }))
    );
    for (let i = 0; i < areaRows.length; i += 80) {
      const chunk = areaRows.slice(i, i + 80);
      const { error: areaError } = await admin.from("catalog_areas").insert(chunk);
      if (areaError && !/duplicate|unique/i.test(areaError.message)) {
        return { ok: false as const, missing: false, error: areaError.message };
      }
    }
  }

  return { ok: true as const, seeded: true };
}

export function staticPublicCatalog() {
  const areas: Record<string, string[]> = {};
  for (const [city, list] of Object.entries(CITY_AREAS)) {
    areas[city] = [...list];
  }
  return {
    cities: [...CITIES],
    areas,
  };
}

export const CITY_SENTINEL_AREA = "__nn_city__";
export const AREA_PREFIX = "__nn_area__:";
export const HIDDEN_BUILDING_CITY = "__nn_hidden__";

function parseAreaSentinel(buildingName: string) {
  if (!buildingName.startsWith(AREA_PREFIX)) return null;
  const rest = buildingName.slice(AREA_PREFIX.length);
  const [kind, flag] = rest.split(":");
  if (!kind || !flag) return null;
  if (!["area", "society", "community"].includes(kind)) return null;
  return {
    kind: kind as CatalogArea["kind"],
    enabled: flag === "on",
  };
}

export function isCatalogSentinel(row: {
  city?: string;
  area?: string;
  building_name?: string;
}) {
  return (
    row.area === CITY_SENTINEL_AREA ||
    (row.building_name ?? "").startsWith(AREA_PREFIX) ||
    row.city === HIDDEN_BUILDING_CITY
  );
}

export async function loadSentinelCatalog(admin: SupabaseClient) {
  const fallback = staticPublicCatalog();
  const { data: rows } = await admin
    .from("locations")
    .select("id, city, area, building_name")
    .limit(1000);

  const locations = rows ?? [];
  const cityRows = locations.filter((row) => row.area === CITY_SENTINEL_AREA);
  const disabledCities = new Set(
    cityRows.filter((row) => row.building_name === "off").map((row) => row.city)
  );
  const extraCities = cityRows
    .filter((row) => row.building_name === "on")
    .map((row) => row.city);
  const cityIds = new Map(cityRows.map((row) => [row.city + ":" + row.building_name, row.id]));

  const cityNames = [...new Set([...fallback.cities, ...extraCities])];
  const cities: CatalogCity[] = cityNames.map((name) => ({
    id: cityIds.get(name + ":off") ?? cityIds.get(name + ":on"),
    name,
    is_enabled: !disabledCities.has(name),
  }));

  const areaSentinels = locations.filter((row) =>
    (row.building_name ?? "").startsWith(AREA_PREFIX)
  );
  const areas: CatalogArea[] = [];
  const areaKeys = new Set<string>();
  for (const row of areaSentinels) {
    const parsed = parseAreaSentinel(row.building_name);
    if (!parsed) continue;
    const key = `${row.city}|${row.area}|${parsed.kind}`;
    if (areaKeys.has(key) && parsed.enabled) continue;
    areaKeys.add(key);
    areas.push({
      id: row.id,
      city: row.city,
      name: row.area,
      kind: parsed.kind,
      is_enabled: parsed.enabled,
    });
  }
  for (const [city, names] of Object.entries(fallback.areas)) {
    for (const name of names) {
      const key = `${city}|${name}|area`;
      if (areaKeys.has(key)) continue;
      areaKeys.add(key);
      areas.push({ city, name, kind: "area", is_enabled: true });
    }
  }

  const hiddenIds = new Set(
    locations
      .filter((row) => row.city === HIDDEN_BUILDING_CITY)
      .map((row) => row.building_name)
  );
  const buildings: CatalogBuilding[] = locations
    .filter((row) => !isCatalogSentinel(row))
    .map((row) => ({
      id: row.id,
      city: row.city,
      area: row.area,
      building_name: row.building_name,
      kind: "building" as const,
      is_enabled: !hiddenIds.has(row.id),
    }));

  return { cities, areas, buildings };
}

