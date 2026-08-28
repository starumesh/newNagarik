import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { renterDetailsSchema } from "@/lib/validations";
import { verifyRentEntry } from "@/lib/verification/engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = renterDetailsSchema.extend({
  city: z.string().min(2),
  area: z.string().min(2),
  building_name: z.string().min(2),
});

export async function POST(request: NextRequest) {
  const limited = await limitByIp(clientIp(request), "submit-rent", 6);
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

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
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
    return NextResponse.json({ error: "Location failed." }, { status: 500 });
  }

  const verification = await verifyRentEntry(user.id, {
    ...payload,
    location_id: location.id,
  });

  if (verification.status === "blocked") {
    return NextResponse.json({ error: "Submission blocked." }, { status: 403 });
  }

  const { data: entry, error } = await admin
    .from("rent_entries")
    .insert({
      user_id: user.id,
      location_id: location.id,
      bhk: payload.bhk,
      monthly_rent: payload.monthly_rent,
      maintenance: payload.maintenance,
      carpet_area: payload.carpet_area,
      floor_level: payload.floor_level,
      furnishing: payload.furnishing,
      total_units: payload.total_units,
      has_lift: payload.has_lift,
      has_parking: payload.parking !== "no",
      parking: payload.parking,
      power_backup: payload.power_backup,
      metro_distance: payload.metro_distance,
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

  if (error || !entry) {
    return NextResponse.json({ error: "Could not save entry." }, { status: 500 });
  }

  await admin.from("verification_logs").insert({
    rent_entry_id: entry.id,
    ...verification.pillars,
    details: verification.details,
  });

  if (verification.status === "auto_approved") {
    await admin
      .from("user_profiles")
      .update({ role: "renter", trust_score: 100 })
      .eq("id", user.id);
  }

  return NextResponse.json({
    ok: true,
    status: verification.status,
    reason: verification.reason,
  });
}
