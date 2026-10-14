import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  seedCatalogIfEmpty,
  staticPublicCatalog,
  tableMissing,
  loadSentinelCatalog,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const fallback = staticPublicCatalog();
  try {
    const admin = createAdminClient();
    const seeded = await seedCatalogIfEmpty(admin);
    if (!seeded.ok && seeded.missing) {
      const sentinels = await loadSentinelCatalog(admin);
      const cities = sentinels.cities.filter((row) => row.is_enabled).map((row) => row.name);
      const areas: Record<string, string[]> = {};
      for (const area of sentinels.areas) {
        if (!area.is_enabled) continue;
        if (!areas[area.city]) areas[area.city] = [];
        if (!areas[area.city]!.includes(area.name)) areas[area.city]!.push(area.name);
      }
      return NextResponse.json({
        cities: cities.length ? cities : fallback.cities,
        areas: Object.keys(areas).length ? areas : fallback.areas,
      });
    }

    const [{ data: cities }, { data: areas }] = await Promise.all([
      admin
        .from("catalog_cities")
        .select("name, is_enabled")
        .eq("is_enabled", true)
        .order("name"),
      admin
        .from("catalog_areas")
        .select("city, name, is_enabled")
        .eq("is_enabled", true)
        .order("name"),
    ]);

    const cityNames = (cities ?? []).map((row) => row.name as string);
    const areasByCity: Record<string, string[]> = {};
    for (const row of areas ?? []) {
      if (!row.is_enabled) continue;
      const city = row.city as string;
      const name = row.name as string;
      if (!areasByCity[city]) areasByCity[city] = [];
      if (!areasByCity[city].includes(name)) areasByCity[city].push(name);
    }

    return NextResponse.json({
      cities: cityNames.length ? cityNames : fallback.cities,
      areas: Object.keys(areasByCity).length ? areasByCity : fallback.areas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (tableMissing(message)) return NextResponse.json(fallback);
    return NextResponse.json(fallback);
  }
}
