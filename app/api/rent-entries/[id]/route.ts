import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { friendlyDbError, renterDetailsSchema } from "@/lib/validations";
import { verifyRentEntry } from "@/lib/verification/engine";
import { computeTrustScore } from "@/lib/trust";
import { updateRentEntryWithInsights } from "@/lib/rent-entry-persist";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = renterDetailsSchema.extend({
  city: z.string().min(2),
  area: z.string().min(2),
  building_name: z.string().min(2),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = await limitByIp(clientIp(request), "edit-rent", 8);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const entryId = params.id;
  if (!entryId) {
    return NextResponse.json({ error: "Missing review id." }, { status: 400 });
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

  const { data: existing, error: existingError } = await admin
    .from("rent_entries")
    .select("id, user_id")
    .eq("id", entryId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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
      { error: friendlyDbError(locationError, "Location failed.") },
      { status: 500 }
    );
  }

  const metroKm = payload.metro_distance_km ?? payload.metro_distance ?? null;

  const verification = await verifyRentEntry(
    user.id,
    {
      ...payload,
      metro_distance: metroKm ?? undefined,
      location_id: location.id,
    },
    { excludeEntryId: entryId }
  );

  if (verification.status === "blocked") {
    return NextResponse.json(
      {
        error:
          "Your account isn’t able to submit right now. Please contact support if you need help.",
      },
      { status: 403 }
    );
  }

  const { insights, error: updateError } = await updateRentEntryWithInsights(
    admin,
    entryId,
    user.id,
    {
      userId: user.id,
      locationId: location.id,
      bhk: payload.bhk,
      monthly_rent: payload.monthly_rent,
      maintenance: payload.maintenance,
      carpet_area: payload.carpet_area,
      floor_level: payload.floor_level,
      furnishing: payload.furnishing,
      total_units: payload.total_units,
      has_lift: payload.has_lift,
      parking: payload.parking,
      power_backup: payload.power_backup,
      metro_distance: metroKm,
      railway_distance_km: payload.railway_distance_km ?? null,
      airport_distance_km: payload.airport_distance_km ?? null,
      problems_faced: payload.problems_faced ?? "",
      hurdles: payload.hurdles ?? "",
      local_politics: payload.local_politics ?? "",
      legal_issues: payload.legal_issues ?? "",
      internal_locality_avg: verification.details.internal_avg
        ? Math.round(Number(verification.details.internal_avg))
        : null,
      scraped_external_avg: verification.details.scraped_avg
        ? Math.round(Number(verification.details.scraped_avg))
        : null,
      verification_status: verification.status,
    }
  );

  if (updateError) {
    return NextResponse.json(
      {
        error: friendlyDbError(
          { message: updateError },
          "Could not update your rental review."
        ),
      },
      { status: 500 }
    );
  }

  await admin.from("verification_logs").insert({
    rent_entry_id: entryId,
    ...verification.pillars,
    details: {
      ...verification.details,
      edited: true,
      local_insights: insights,
    },
  });

  const { data: profile } = await admin
    .from("user_profiles")
    .select("purpose")
    .eq("id", user.id)
    .maybeSingle();

  const trustScore = computeTrustScore({
    role: "renter",
    purpose: profile?.purpose,
    verificationStatus: "under_review",
  });

  await admin
    .from("user_profiles")
    .update({ role: "renter", trust_score: trustScore })
    .eq("id", user.id);

  return NextResponse.json({
    ok: true,
    status: verification.status,
    reason: verification.reason,
    trust_score: trustScore,
  });
}
