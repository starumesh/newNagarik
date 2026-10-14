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
    carpet_area?: number;
    furnishing?: string;
    maintenance_status?: "included" | "extra" | "none";
    maintenance_amount?: number | null;
    pet_friendly?: "yes" | "no" | "case_by_case";
    pet_case_notes?: string;
    photos?: string[];
  };

  if (!body.location_id || !body.asking_rent || body.asking_rent <= 0) {
    return NextResponse.json(
      { error: "Please enter a positive asking rent and location." },
      { status: 400 }
    );
  }
  if (body.carpet_area != null && body.carpet_area <= 0) {
    return NextResponse.json(
      { error: "Carpet area must be a positive number." },
      { status: 400 }
    );
  }
  if (
    body.maintenance_status === "extra" &&
    (!body.maintenance_amount || body.maintenance_amount <= 0)
  ) {
    return NextResponse.json(
      { error: "Please enter the monthly maintenance amount." },
      { status: 400 }
    );
  }
  if (
    body.pet_friendly === "case_by_case" &&
    !body.pet_case_notes?.trim()
  ) {
    return NextResponse.json(
      { error: "Please briefly describe the pet policy case." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("property_listings")
    .insert({
      owner_id: user.id,
      location_id: body.location_id,
      asking_rent: body.asking_rent,
      bhk: body.bhk ?? 2,
      carpet_area: body.carpet_area ?? null,
      furnishing: body.furnishing ?? "unfurnished",
      maintenance_status: body.maintenance_status ?? "extra",
      maintenance_amount:
        body.maintenance_status === "extra" ? body.maintenance_amount ?? null : null,
      pet_friendly: body.pet_friendly ?? "case_by_case",
      pet_case_notes: body.pet_case_notes ?? "",
      photos: body.photos ?? [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "We couldn’t create the listing. Please try again." },
      { status: 500 }
    );
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
