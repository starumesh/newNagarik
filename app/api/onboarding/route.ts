import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { friendlyDbError, onboardingSchema } from "@/lib/validations";
import { verifyRentEntry } from "@/lib/verification/engine";
import { canAccessGranularData } from "@/lib/access";
import { computeTrustScore } from "@/lib/trust";
import { insertRentEntryWithInsights } from "@/lib/rent-entry-persist";

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
    const message =
      parsed.error.issues[0]?.message ??
      "Please review your details and try again.";
    return NextResponse.json(
      { error: message, issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const admin = createAdminClient();

  const { data: location, error: locationError } = await admin
    .from("locations")
    .upsert(
      {
        city: payload.city.trim(),
        area: payload.area.trim(),
        building_name: payload.building_name.trim(),
      },
      { onConflict: "city,area,building_name" }
    )
    .select("*")
    .single();

  if (locationError || !location) {
    return NextResponse.json(
      {
        error: friendlyDbError(
          locationError,
          "We couldn’t save your location just now. Please try again in a moment."
        ),
        detail: locationError?.message,
      },
      { status: 500 }
    );
  }

  if (payload.role === "explorer") {
    const trustScore = computeTrustScore({
      role: "explorer",
      purpose: "view_trends",
    });
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({
        role: "explorer",
        trust_score: trustScore,
        purpose: "view_trends",
        home_city: payload.city,
        onboarding_completed: true,
        explorer_notes: payload.explorer ?? {},
      })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json(
        {
          error: friendlyDbError(
            profileError,
            "We couldn’t finish explorer setup. Please try again."
          ),
          detail: profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      next: "/dashboard",
    });
  }

  if (payload.role === "owner" && payload.owner) {
    const trustScore = computeTrustScore({
      role: "owner",
      purpose: payload.purpose,
    });
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({
        role: "owner",
        trust_score: trustScore,
        purpose: payload.purpose,
        home_city: payload.city,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json(
        {
          error: friendlyDbError(
            profileError,
            "We couldn’t update your owner profile. Please try again."
          ),
          detail: profileError.message,
        },
        { status: 500 }
      );
    }

    const listingRow = {
      owner_id: user.id,
      location_id: location.id,
      asking_rent: payload.owner.asking_rent,
      bhk: payload.owner.bhk,
      carpet_area: payload.owner.carpet_area,
      furnishing: payload.owner.furnishing,
      maintenance_status: payload.owner.maintenance_status,
      maintenance_amount:
        payload.owner.maintenance_status === "extra"
          ? payload.owner.maintenance_amount
          : null,
      pet_friendly: payload.owner.pet_friendly,
      pet_case_notes:
        payload.owner.pet_friendly === "case_by_case"
          ? payload.owner.pet_case_notes
          : "",
      building_age_years: payload.owner.building_age_years,
      floor_number: payload.owner.floor_number,
      facilities: payload.owner.facilities ?? [],
    };

    let { error: listingError } = await admin
      .from("property_listings")
      .insert(listingRow);

    // Fallback for DBs that have not run migrations 002/003 yet.
    if (
      listingError &&
      /column|schema cache/i.test(listingError.message)
    ) {
      const retry = await admin.from("property_listings").insert({
        owner_id: user.id,
        location_id: location.id,
        asking_rent: payload.owner.asking_rent,
        bhk: payload.owner.bhk,
        furnishing: payload.owner.furnishing,
      });
      listingError = retry.error;
      if (!listingError) {
        return NextResponse.json({
          ok: true,
          next: "/dashboard",
          warning:
            "Listing saved with core fields only. Run SQL migrations 002–004 to store carpet area, maintenance, and pet details.",
        });
      }
    }

    if (listingError) {
      return NextResponse.json(
        {
          error: friendlyDbError(
            listingError,
            "We couldn’t save your listing. Please review the property details and try again."
          ),
          detail: listingError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, next: "/dashboard" });
  }

  if (payload.role === "renter" && payload.renter) {
    const metroKm =
      payload.renter.metro_distance_km ?? payload.renter.metro_distance ?? null;

    const verification = await verifyRentEntry(user.id, {
      ...payload.renter,
      metro_distance: metroKm ?? undefined,
      location_id: location.id,
      city: payload.city,
      area: payload.area,
      building_name: payload.building_name,
    });

    if (verification.status === "blocked") {
      return NextResponse.json(
        {
          error:
            "Your account isn’t able to submit right now. Please contact support if you need help.",
        },
        { status: 403 }
      );
    }

    const rentPersist = {
      userId: user.id,
      locationId: location.id,
      bhk: payload.renter.bhk,
      monthly_rent: payload.renter.monthly_rent,
      maintenance: payload.renter.maintenance,
      carpet_area: payload.renter.carpet_area,
      floor_level: payload.renter.floor_level,
      furnishing: payload.renter.furnishing,
      total_units: payload.renter.total_units,
      has_lift: payload.renter.has_lift,
      parking: payload.renter.parking,
      power_backup: payload.renter.power_backup,
      metro_distance: metroKm,
      railway_distance_km: payload.renter.railway_distance_km ?? null,
      airport_distance_km: payload.renter.airport_distance_km ?? null,
      problems_faced: payload.renter.problems_faced ?? "",
      hurdles: payload.renter.hurdles ?? "",
      local_politics: payload.renter.local_politics ?? "",
      legal_issues: payload.renter.legal_issues ?? "",
      internal_locality_avg: verification.details.internal_avg
        ? Math.round(Number(verification.details.internal_avg))
        : null,
      scraped_external_avg: verification.details.scraped_avg
        ? Math.round(Number(verification.details.scraped_avg))
        : null,
      verification_status: verification.status,
    };

    const { id: entryId, insights, error: entryError } =
      await insertRentEntryWithInsights(admin, rentPersist);

    if (entryError || !entryId) {
      return NextResponse.json(
        {
          error: friendlyDbError(
            entryError ? { message: entryError } : null,
            "We couldn’t save your rent details. Please review the property fields and try again."
          ),
          detail: entryError,
        },
        { status: 500 }
      );
    }

    await admin.from("verification_logs").insert({
      rent_entry_id: entryId,
      ...verification.pillars,
      details: {
        ...verification.details,
        local_insights: insights,
      },
    });

    const trustScore = computeTrustScore({
      role: "renter",
      purpose: payload.purpose,
      // Submit never grants Verified — only admin approval does.
      verificationStatus: "under_review",
    });
    const { error: renterProfileError } = await admin
      .from("user_profiles")
      .update({
        role: "renter",
        trust_score: trustScore,
        purpose: payload.purpose,
        home_city: payload.city,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (renterProfileError) {
      return NextResponse.json(
        {
          error: friendlyDbError(
            renterProfileError,
            "Rent details were saved, but we couldn’t finish your profile update. Please run the latest purpose migration and try again."
          ),
          detail: renterProfileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      next: "/dashboard",
      verification: verification.status,
      reason: verification.reason,
      trust_score: trustScore,
      unlocked: canAccessGranularData({
        id: user.id,
        role: "renter",
        trust_score: trustScore,
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
