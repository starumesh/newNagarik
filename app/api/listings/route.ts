import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isR2Configured } from "@/lib/env";
import { presignListingUpload } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("property_listings")
    .select("*, locations(*)")
    .eq("owner_id", user.id)
    .limit(15);

  if (error) {
    return NextResponse.json({ error: "Could not load listings." }, { status: 500 });
  }
  return NextResponse.json({ listings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can list." }, { status: 403 });
  }

  const body = (await request.json()) as {
    location_id?: string;
    asking_rent?: number;
    bhk?: number;
    furnishing?: string;
    photos?: string[];
  };

  if (!body.location_id || !body.asking_rent) {
    return NextResponse.json({ error: "Missing listing fields." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("property_listings")
    .insert({
      owner_id: user.id,
      location_id: body.location_id,
      asking_rent: body.asking_rent,
      bhk: body.bhk ?? 2,
      furnishing: body.furnishing ?? "unfurnished",
      photos: body.photos ?? [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not create listing." }, { status: 500 });
  }
  return NextResponse.json({ listing: data });
}

export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Photo storage is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    fileName?: string;
    contentType?: string;
  };
  if (!body.fileName || !body.contentType) {
    return NextResponse.json({ error: "Missing file metadata." }, { status: 400 });
  }

  const key = `listings/${user.id}/${Date.now()}-${body.fileName.replace(/[^\w.\-]+/g, "")}`;
  const signed = await presignListingUpload(key, body.contentType);
  return NextResponse.json(signed);
}
