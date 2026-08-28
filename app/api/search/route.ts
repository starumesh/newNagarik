import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessGranularData } from "@/lib/access";
import { getExternalListings } from "@/lib/scrapers";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!canAccessGranularData(profile as UserProfile | null)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const building = searchParams.get("building")?.trim();
  const bhk = searchParams.get("bhk");
  const furnishing = searchParams.get("furnishing");
  const minRent = searchParams.get("minRent");
  const maxRent = searchParams.get("maxRent");

  if (!building) {
    return NextResponse.json({ error: "Building is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: locations } = await admin
    .from("locations")
    .select("*")
    .ilike("building_name", `%${building}%`)
    .limit(15);

  const locationIds = (locations ?? []).map((row) => row.id);
  if (locationIds.length === 0) {
    const [city, area] = (searchParams.get("city") ?? "Bengaluru").split(":");
    const { listings } = await getExternalListings({
      city: city || "Bengaluru",
      area: area || "Whitefield",
      building_name: building,
    });
    return NextResponse.json({
      internal: [],
      listings: [],
      external: listings,
    });
  }

  let query = admin
    .from("rent_entries")
    .select("*, locations(*)")
    .in("location_id", locationIds)
    .eq("verification_status", "auto_approved")
    .limit(15);

  if (bhk) query = query.eq("bhk", Number(bhk));
  if (furnishing) query = query.eq("furnishing", furnishing);
  if (minRent) query = query.gte("monthly_rent", Number(minRent));
  if (maxRent) query = query.lte("monthly_rent", Number(maxRent));

  const { data: internal, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  const rents = (internal ?? []).map((row) => row.monthly_rent);
  const stats =
    rents.length > 0
      ? {
          avg: Math.round(rents.reduce((sum, value) => sum + value, 0) / rents.length),
          median: median(rents),
          min: Math.min(...rents),
          max: Math.max(...rents),
          count: rents.length,
        }
      : undefined;

  const { data: listings } = await admin
    .from("property_listings")
    .select("*, locations(*)")
    .in("location_id", locationIds)
    .eq("is_active", true)
    .limit(15);

  if ((internal ?? []).length === 0) {
    const loc = locations![0]!;
    const { listings: external } = await getExternalListings({
      city: loc.city,
      area: loc.area,
      building_name: loc.building_name,
    });
    return NextResponse.json({
      internal: [],
      listings: listings ?? [],
      external,
      building: loc,
      stats,
    });
  }

  return NextResponse.json({
    internal: internal ?? [],
    listings: listings ?? [],
    external: [],
    building: locations![0],
    stats,
  });
}
