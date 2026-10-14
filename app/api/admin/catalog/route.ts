import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  seedCatalogIfEmpty,
  tableMissing,
  loadSentinelCatalog,
  CITY_SENTINEL_AREA,
  AREA_PREFIX,
  HIDDEN_BUILDING_CITY,
  type CatalogArea,
  type CatalogBuilding,
  type CatalogCity,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const seeded = await seedCatalogIfEmpty(admin);
  if (!seeded.ok && seeded.missing) {
    const fallback = await loadSentinelCatalog(admin);
    return NextResponse.json({
      missingSchema: false,
      usingFallback: true,
      cities: fallback.cities,
      areas: fallback.areas,
      buildings: fallback.buildings,
    });
  }
  if (!seeded.ok) {
    return NextResponse.json({ error: seeded.error }, { status: 500 });
  }

  const [{ data: cities, error: cityError }, { data: areas, error: areaError }, buildingsResult] =
    await Promise.all([
      admin.from("catalog_cities").select("*").order("name"),
      admin.from("catalog_areas").select("*").order("name"),
      admin
        .from("locations")
        .select("id, city, area, building_name, kind, is_enabled")
        .order("building_name")
        .limit(400),
    ]);

  if (cityError || areaError) {
    return NextResponse.json(
      { error: cityError?.message ?? areaError?.message },
      { status: 500 }
    );
  }

  let buildings = (buildingsResult.data ?? []) as CatalogBuilding[];
  if (buildingsResult.error && tableMissing(buildingsResult.error.message) === false) {
    const retry = await admin
      .from("locations")
      .select("id, city, area, building_name")
      .order("building_name")
      .limit(400);
    buildings = (retry.data ?? []).map((row) => ({
      ...row,
      kind: "building" as const,
      is_enabled: true,
    }));
  }

  return NextResponse.json({
    missingSchema: false,
    cities: (cities ?? []) as CatalogCity[],
    areas: (areas ?? []) as CatalogArea[],
    buildings,
  });
}

export async function POST(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: "create" | "toggle" | "delete";
    target?: "city" | "area" | "building";
    id?: string;
    name?: string;
    city?: string;
    area?: string;
    kind?: string;
    is_enabled?: boolean;
  };

  if (!body.action || !body.target) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  const admin = createAdminClient();
  const probe = await admin
    .from("catalog_cities")
    .select("id", { count: "exact", head: true });
  if (probe.error && tableMissing(probe.error.message)) {
    const result = await mutateSentinelCatalog(admin, body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
    }
    return NextResponse.json(result);
  }

  if (body.target === "city") {
    if (body.action === "create") {
      const name = body.name?.trim();
      if (!name || name.length < 2) {
        return NextResponse.json({ error: "Enter a city name." }, { status: 400 });
      }
      const { data, error } = await admin
        .from("catalog_cities")
        .upsert({ name, is_enabled: true }, { onConflict: "name" })
        .select("*")
        .single();
      if (error) {
        return NextResponse.json(
          { error: tableMissing(error.message) ? "Run the catalog SQL migration first." : error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ city: data });
    }
    if (!body.id) {
      return NextResponse.json({ error: "Missing city id." }, { status: 400 });
    }
    if (body.action === "toggle") {
      const { error } = await admin
        .from("catalog_cities")
        .update({ is_enabled: Boolean(body.is_enabled) })
        .eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    const { error } = await admin.from("catalog_cities").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.target === "area") {
    if (body.action === "create") {
      const city = body.city?.trim();
      const name = body.name?.trim();
      const kind = (body.kind as CatalogArea["kind"]) || "area";
      if (!city || !name) {
        return NextResponse.json({ error: "Enter a city and area name." }, { status: 400 });
      }
      const { data, error } = await admin
        .from("catalog_areas")
        .upsert(
          { city, name, kind, is_enabled: true },
          { onConflict: "city,name,kind" }
        )
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ area: data });
    }
    if (!body.id) {
      return NextResponse.json({ error: "Missing area id." }, { status: 400 });
    }
    if (body.action === "toggle") {
      const { error } = await admin
        .from("catalog_areas")
        .update({ is_enabled: Boolean(body.is_enabled) })
        .eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    const { error } = await admin.from("catalog_areas").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "create") {
    const city = body.city?.trim();
    const area = body.area?.trim();
    const name = body.name?.trim();
    const kind = (body.kind as CatalogBuilding["kind"]) || "building";
    if (!city || !area || !name) {
      return NextResponse.json(
        { error: "Enter city, area, and building / society name." },
        { status: 400 }
      );
    }
    const { data, error } = await admin
      .from("locations")
      .upsert(
        { city, area, building_name: name, kind, is_enabled: true },
        { onConflict: "city,area,building_name" }
      )
      .select("*")
      .single();
    if (error) {
      const retry = await admin
        .from("locations")
        .upsert(
          { city, area, building_name: name },
          { onConflict: "city,area,building_name" }
        )
        .select("*")
        .single();
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      return NextResponse.json({ building: retry.data });
    }
    return NextResponse.json({ building: data });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing building id." }, { status: 400 });
  }
  if (body.action === "toggle") {
    const { error } = await admin
      .from("locations")
      .update({ is_enabled: Boolean(body.is_enabled) })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const { error } = await admin.from("locations").delete().eq("id", body.id);
  if (error) {
    return NextResponse.json(
      { error: "Could not delete. It may still have reviews attached." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

async function mutateSentinelCatalog(
  admin: ReturnType<typeof createAdminClient>,
  body: {
    action?: "create" | "toggle" | "delete";
    target?: "city" | "area" | "building";
    id?: string;
    name?: string;
    city?: string;
    area?: string;
    kind?: string;
    is_enabled?: boolean;
  }
) {
  if (body.target === "city") {
    const name = body.name?.trim() || body.city?.trim();
    if (body.action === "create") {
      if (!name || name.length < 2) return { error: "Enter a city name.", status: 400 };
      await admin.from("locations").upsert(
        { city: name, area: CITY_SENTINEL_AREA, building_name: "on" },
        { onConflict: "city,area,building_name" }
      );
      await admin
        .from("locations")
        .delete()
        .eq("city", name)
        .eq("area", CITY_SENTINEL_AREA)
        .eq("building_name", "off");
      return { ok: true };
    }
    const cityName = await cityNameFromId(admin, body.id, name);
    if (!cityName) return { error: "Missing city.", status: 400 };
    if (body.action === "toggle") {
      const enabled = Boolean(body.is_enabled);
      await admin.from("locations").upsert(
        {
          city: cityName,
          area: CITY_SENTINEL_AREA,
          building_name: enabled ? "on" : "off",
        },
        { onConflict: "city,area,building_name" }
      );
      await admin
        .from("locations")
        .delete()
        .eq("city", cityName)
        .eq("area", CITY_SENTINEL_AREA)
        .eq("building_name", enabled ? "off" : "on");
      return { ok: true };
    }
    await admin
      .from("locations")
      .delete()
      .eq("city", cityName)
      .eq("area", CITY_SENTINEL_AREA);
    return { ok: true };
  }

  if (body.target === "area") {
    const city = body.city?.trim();
    const name = body.name?.trim();
    const kind = (body.kind as CatalogArea["kind"]) || "area";
    if (body.action === "create") {
      if (!city || !name) return { error: "Enter a city and area name.", status: 400 };
      await admin.from("locations").upsert(
        {
          city,
          area: name,
          building_name: `${AREA_PREFIX}${kind}:on`,
        },
        { onConflict: "city,area,building_name" }
      );
      return { ok: true };
    }
    if (!body.id) return { error: "Missing area id.", status: 400 };
    const { data: row } = await admin
      .from("locations")
      .select("*")
      .eq("id", body.id)
      .maybeSingle();
    if (!row) return { error: "Area not found.", status: 404 };
    if (body.action === "toggle") {
      const enabled = Boolean(body.is_enabled);
      const nextKind = (body.kind as CatalogArea["kind"]) || kind;
      await admin
        .from("locations")
        .update({ building_name: `${AREA_PREFIX}${nextKind}:${enabled ? "on" : "off"}` })
        .eq("id", body.id);
      return { ok: true };
    }
    await admin.from("locations").delete().eq("id", body.id);
    return { ok: true };
  }

  if (body.action === "create") {
    const city = body.city?.trim();
    const area = body.area?.trim();
    const name = body.name?.trim();
    if (!city || !area || !name) {
      return { error: "Enter city, area, and building / society name.", status: 400 };
    }
    const { data, error } = await admin
      .from("locations")
      .upsert(
        { city, area, building_name: name },
        { onConflict: "city,area,building_name" }
      )
      .select("*")
      .single();
    if (error) return { error: error.message, status: 500 };
    return { building: data };
  }

  if (!body.id) return { error: "Missing building id.", status: 400 };
  if (body.action === "toggle") {
    if (body.is_enabled) {
      await admin
        .from("locations")
        .delete()
        .eq("city", HIDDEN_BUILDING_CITY)
        .eq("building_name", body.id);
    } else {
      await admin.from("locations").upsert(
        {
          city: HIDDEN_BUILDING_CITY,
          area: "building",
          building_name: body.id,
        },
        { onConflict: "city,area,building_name" }
      );
    }
    return { ok: true };
  }
  const { error } = await admin.from("locations").delete().eq("id", body.id);
  if (error) {
    return { error: "Could not delete. It may still have reviews attached.", status: 409 };
  }
  return { ok: true };
}

async function cityNameFromId(
  admin: ReturnType<typeof createAdminClient>,
  id?: string,
  fallback?: string
) {
  if (fallback) return fallback;
  if (!id) return null;
  const { data } = await admin.from("locations").select("city").eq("id", id).maybeSingle();
  return data?.city ?? null;
}

