import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { onboardingSchema } from "@/lib/validations";
import { verifyRentEntry } from "@/lib/verification/engine";
import { canAccessGranularData } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limited = await limitByIp(clientIp(request), "onboarding", 8);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = onboardingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid onboarding payload.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const admin = createAdminClient();

  const { data: location, error: locationError } = await admin
    .from("locations")
    .upsert(
      {
        city: payload.city,
        area: payload.area,
        building_name: payload.building_name,
      },
      { onConflict: "city,area,building_name" }
    )
    .select("*")
    .single();

  if (locationError || !location) {
    return NextResponse.json(
      { error: "Could not save location." },
      { status: 500 }
    );
  }

  if (payload.role === "explorer") {
    await admin
      .from("user_profiles")
      .update({
        role: "explorer",
        trust_score: 50,
        purpose: "view_trends",
        home_city: payload.city,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      next: "/dashboard",
      message: "You will only see macro market trends until you contribute data.",
    });
  }

  if (payload.role === "owner" && payload.owner) {
    await admin
      .from("user_profiles")
      .update({
        role: "owner",
        trust_score: 80,
        purpose: payload.purpose,
        home_city: payload.city,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    await admin.from("property_listings").insert({
      owner_id: user.id,
      location_id: location.id,
      asking_rent: payload.owner.asking_rent,
      bhk: payload.owner.bhk,
      furnishing: payload.owner.furnishing,
    });

    return NextResponse.json({ ok: true, next: "/dashboard" });
  }

  if (payload.role === "renter" && payload.renter) {
    const verification = await verifyRentEntry(user.id, {
      ...payload.renter,
      location_id: location.id,
      city: payload.city,
      area: payload.area,
      building_name: payload.building_name,
    });

    if (verification.status === "blocked") {
      return NextResponse.json(
        { error: "Submission blocked." },
        { status: 403 }
      );
    }

    const { data: entry, error: entryError } = await admin
      .from("rent_entries")
      .insert({
        user_id: user.id,
        location_id: location.id,
        bhk: payload.renter.bhk,
        monthly_rent: payload.renter.monthly_rent,
        maintenance: payload.renter.maintenance,
        carpet_area: payload.renter.carpet_area,
        floor_level: payload.renter.floor_level,
        furnishing: payload.renter.furnishing,
        total_units: payload.renter.total_units,
        has_lift: payload.renter.has_lift,
        has_parking: payload.renter.parking !== "no",
        parking: payload.renter.parking,
        power_backup: payload.renter.power_backup,
        metro_distance: payload.renter.metro_distance,
        internal_locality_avg: verification.details.internal_avg
          ? Math.round(Number(verification.details.internal_avg))
          : null,
        scraped_external_avg: verification.details.scraped_avg
          ? Math.round(Number(verification.details.scraped_avg))
          : null,
        verification_status: verification.status,
      })
      .select("id")
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "Could not save rent entry." },
        { status: 500 }
      );
    }

    await admin.from("verification_logs").insert({
      rent_entry_id: entry.id,
      ...verification.pillars,
      details: verification.details,
    });

    const approved = verification.status === "auto_approved";
    await admin
      .from("user_profiles")
      .update({
        role: "renter",
        trust_score: approved ? 100 : 50,
        purpose: payload.purpose,
        home_city: payload.city,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      next: "/dashboard",
      verification: verification.status,
      reason: verification.reason,
      unlocked: canAccessGranularData({
        id: user.id,
        role: "renter",
        trust_score: approved ? 100 : 50,
        restricted_until: null,
        onboarding_completed: true,
        purpose: payload.purpose,
        home_city: payload.city,
        created_at: new Date().toISOString(),
      }),
    });
  }

  return NextResponse.json({ error: "Unsupported role." }, { status: 400 });
}
