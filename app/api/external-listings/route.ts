import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessGranularData } from "@/lib/access";
import { getExternalListings } from "@/lib/scrapers";
import { isAdminRequest } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = isAdminRequest(request);

  if (!admin) {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "Bengaluru";
  const area = searchParams.get("area") ?? "Whitefield";
  const building = searchParams.get("building");
  if (!building) {
    return NextResponse.json({ error: "Building required." }, { status: 400 });
  }

  try {
    const result = await getExternalListings({
      city,
      area,
      building_name: building,
    });
    if (result.listings.length === 0) {
      return NextResponse.json({
        listings: [],
        source: "none",
        message: "No external listings available currently",
      });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      listings: [],
      source: "none",
      message: "No external listings available currently",
    });
  }
}
