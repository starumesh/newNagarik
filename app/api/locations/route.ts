import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const area = searchParams.get("area");
  const q = searchParams.get("q")?.trim();

  let query = supabase.from("locations").select("*").limit(15);
  if (city) query = query.eq("city", city);
  if (area) query = query.eq("area", area);
  if (q) query = query.ilike("building_name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load locations." }, { status: 500 });
  }
  return NextResponse.json({ locations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    city?: string;
    area?: string;
    building_name?: string;
  };
  if (!body.city || !body.area || !body.building_name) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("locations")
    .upsert(
      {
        city: body.city,
        area: body.area,
        building_name: body.building_name,
      },
      { onConflict: "city,area,building_name" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not add building." }, { status: 500 });
  }
  return NextResponse.json({ location: data });
}
