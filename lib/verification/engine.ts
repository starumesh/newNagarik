import { baselinePsf } from "@/lib/data/baselines";
import { hashIdentity } from "@/lib/hash";
import { getScrapedAveragePsf } from "@/lib/scrapers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RenterDetails } from "@/lib/validations";
import type { VerificationResult, VerificationStatus } from "@/lib/types";

type Payload = RenterDetails & {
  location_id: string;
  city: string;
  area: string;
  building_name: string;
};

export async function verifyRentEntry(
  userId: string,
  payload: Payload
): Promise<VerificationResult> {
  const supabase = createAdminClient();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser.user?.email ?? null;
  const phone =
    payload.phone ||
    (authUser.user?.user_metadata?.phone as string | undefined) ||
    null;
  const { emailHash, phoneHash } = hashIdentity(email, phone);

  const details: Record<string, unknown> = {
    rent_per_sqft: payload.monthly_rent / payload.carpet_area,
  };

  // Pillar 1: Identity fingerprinting
  const banned = await isBanned(emailHash, phoneHash);
  if (banned) {
    return {
      status: "blocked",
      reason: "Submission blocked.",
      pillars: {
        pillar_1_passed: false,
        pillar_2_passed: false,
        pillar_3_passed: false,
        pillar_4_passed: false,
      },
      details: { ...details, banned: true },
    };
  }

  await upsertIdentityHashes(emailHash, phoneHash);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("rent_entries")
    .select("id, location_id")
    .eq("user_id", userId)
    .gte("submitted_at", since)
    .limit(15);

  const distinctBuildings = new Set((recent ?? []).map((row) => row.location_id));
  const rateLimited = distinctBuildings.size > 3 || (recent ?? []).length > 3;
  const pillar1Pass = !rateLimited;

  // Pillar 2: Structural feature-to-value
  const rentPerSqft = payload.monthly_rent / payload.carpet_area;
  let expected = baselinePsf(payload.city, payload.area);
  if (payload.furnishing === "fully") expected *= 1.2;
  if (payload.furnishing === "semi") expected *= 1.05;
  if (payload.furnishing === "unfurnished") expected *= 0.8;
  if (payload.has_lift) expected *= 1.1;
  else expected *= 0.9;
  if (payload.parking === "yes") expected *= 1.08;
  if (payload.parking === "no") expected *= 0.92;
  if (payload.power_backup === "yes") expected *= 1.06;
  if (payload.power_backup === "no") expected *= 0.94;
  if (payload.floor_level === "high") expected *= 1.04;
  if (payload.floor_level === "ground") expected *= 0.97;
  const expectedRent = expected * payload.carpet_area;
  const pillar2Pass = payload.monthly_rent <= 2 * expectedRent;

  details.expected_rent_per_sqft = Number(expected.toFixed(2));
  details.expected_rent = Math.round(expectedRent);

  // Pillar 3: Internal database cross-check
  const buildingStats = await averagePsf(payload.location_id);
  let internalAvg = buildingStats.avg;
  let internalCount = buildingStats.count;
  let internalSource: "building" | "locality" | "none" = "building";

  if (internalCount < 3) {
    const localityStats = await localityAveragePsf(payload.city, payload.area);
    if (localityStats.count >= 3) {
      internalAvg = localityStats.avg;
      internalCount = localityStats.count;
      internalSource = "locality";
    } else {
      internalAvg = null;
      internalSource = "none";
    }
  }

  const pillar3Deviation =
    internalAvg && internalAvg > 0
      ? Math.abs(rentPerSqft - internalAvg) / internalAvg
      : 0;
  const pillar3Pass = !internalAvg || pillar3Deviation <= 0.4;

  details.internal_avg = internalAvg;
  details.internal_count = internalCount;
  details.internal_source = internalSource;
  details.pillar3_deviation = Number(pillar3Deviation.toFixed(3));

  // Pillar 4: External scraped benchmark (cost-gated)
  let pillar4Pass = true;
  let scrapedAvg: number | null = null;
  const shouldScrape =
    pillar3Deviation > 0.3 || internalSource !== "building" || internalCount < 5;

  if (shouldScrape) {
    scrapedAvg = await getScrapedAveragePsf({
      city: payload.city,
      area: payload.area,
      building_name: payload.building_name,
    });
    if (scrapedAvg && rentPerSqft > scrapedAvg * 1.5) {
      pillar4Pass = false;
    }
    if (scrapedAvg) {
      await supabase.from("scraped_benchmarks").insert({
        location_id: payload.location_id,
        avg_psf: scrapedAvg,
        source: "aggregators",
      });
    }
  }

  details.scraped_avg = scrapedAvg;
  details.pillar4_triggered = shouldScrape;

  const allPass = pillar1Pass && pillar2Pass && pillar3Pass && pillar4Pass;
  const status: VerificationStatus = allPass ? "auto_approved" : "under_review";

  return {
    status,
    reason: allPass
      ? undefined
      : rateLimited
        ? "Too many submissions in 24 hours."
        : "Entry flagged for review.",
    pillars: {
      pillar_1_passed: pillar1Pass,
      pillar_2_passed: pillar2Pass,
      pillar_3_passed: pillar3Pass,
      pillar_4_passed: pillar4Pass,
    },
    details,
  };
}

async function isBanned(emailHash: string | null, phoneHash: string | null) {
  const supabase = createAdminClient();
  if (emailHash) {
    const { data } = await supabase
      .from("banned_identities")
      .select("id")
      .eq("identity_hash", emailHash)
      .maybeSingle();
    if (data) return true;
  }
  if (phoneHash) {
    const { data } = await supabase
      .from("banned_identities")
      .select("id")
      .eq("identity_hash", phoneHash)
      .maybeSingle();
    if (data) return true;
  }

  const orFilters = [
    emailHash ? `email_hash.eq.${emailHash}` : null,
    phoneHash ? `phone_hash.eq.${phoneHash}` : null,
  ]
    .filter(Boolean)
    .join(",");
  if (!orFilters) return false;
  const { data } = await supabase
    .from("identity_hashes")
    .select("is_banned")
    .or(orFilters)
    .maybeSingle();
  return Boolean(data?.is_banned);
}

async function upsertIdentityHashes(
  emailHash: string | null,
  phoneHash: string | null
) {
  const supabase = createAdminClient();
  if (emailHash) {
    await supabase.from("identity_hashes").upsert(
      { email_hash: emailHash, phone_hash: phoneHash },
      { onConflict: "email_hash" }
    );
  }
}

async function averagePsf(locationId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("rent_entries")
    .select("monthly_rent, carpet_area")
    .eq("location_id", locationId)
    .eq("verification_status", "auto_approved")
    .limit(15);

  const rows = data ?? [];
  if (rows.length === 0) return { avg: null as number | null, count: 0 };
  const psf = rows.map((row) => row.monthly_rent / row.carpet_area);
  const avg = psf.reduce((sum, value) => sum + value, 0) / psf.length;
  return { avg, count: rows.length };
}

async function localityAveragePsf(city: string, area: string) {
  const supabase = createAdminClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id")
    .eq("city", city)
    .eq("area", area)
    .limit(15);
  const ids = (locations ?? []).map((row) => row.id);
  if (ids.length === 0) return { avg: null as number | null, count: 0 };

  const { data } = await supabase
    .from("rent_entries")
    .select("monthly_rent, carpet_area")
    .in("location_id", ids)
    .eq("verification_status", "auto_approved")
    .limit(15);

  const rows = data ?? [];
  if (rows.length === 0) return { avg: null as number | null, count: 0 };
  const psf = rows.map((row) => row.monthly_rent / row.carpet_area);
  const avg = psf.reduce((sum, value) => sum + value, 0) / psf.length;
  return { avg, count: rows.length };
}
