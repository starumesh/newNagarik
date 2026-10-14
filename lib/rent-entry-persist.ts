import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocalInsights, VerificationStatus } from "@/lib/types";
import { buildLocalInsights, insightsHaveNotes, normalizeLocalInsights, pickInsights } from "@/lib/local-insights";

type PersistInput = {
  userId: string;
  locationId: string;
  bhk: number;
  monthly_rent: number;
  maintenance: number;
  carpet_area: number;
  floor_level: string;
  furnishing: string;
  total_units: string;
  has_lift: boolean;
  parking: "yes" | "no" | "paid";
  power_backup: string;
  metro_distance: number | null;
  railway_distance_km?: number | null;
  airport_distance_km?: number | null;
  problems_faced?: string;
  hurdles?: string;
  local_politics?: string;
  legal_issues?: string;
  internal_locality_avg: number | null;
  scraped_external_avg: number | null;
  verification_status: VerificationStatus;
};

function columnMissing(message?: string) {
  return Boolean(message && /column|schema cache|does not exist/i.test(message));
}

export function insightsFromPayload(input: PersistInput): LocalInsights {
  return buildLocalInsights({
    problems_faced: input.problems_faced,
    hurdles: input.hurdles,
    local_politics: input.local_politics,
    legal_issues: input.legal_issues,
    metro_distance_km: input.metro_distance,
    railway_distance_km: input.railway_distance_km,
    airport_distance_km: input.airport_distance_km,
  });
}

/** Insert rent entry; always returns insights even if the DB column is missing. */
export async function insertRentEntryWithInsights(
  admin: SupabaseClient,
  input: PersistInput
): Promise<{ id: string; insights: LocalInsights; error: string | null }> {
  const insights = insightsFromPayload(input);
  const base = {
    user_id: input.userId,
    location_id: input.locationId,
    bhk: input.bhk,
    monthly_rent: input.monthly_rent,
    maintenance: input.maintenance,
    carpet_area: input.carpet_area,
    floor_level: input.floor_level,
    furnishing: input.furnishing,
    total_units: input.total_units,
    has_lift: input.has_lift,
    has_parking: input.parking !== "no",
    parking: input.parking,
    power_backup: input.power_backup,
    metro_distance: input.metro_distance,
    internal_locality_avg: input.internal_locality_avg,
    scraped_external_avg: input.scraped_external_avg,
    verification_status: input.verification_status,
  };

  let { data, error } = await admin
    .from("rent_entries")
    .insert({ ...base, local_insights: insights })
    .select("id")
    .single();

  if (error && columnMissing(error.message)) {
    const retry = await admin.from("rent_entries").insert(base).select("id").single();
    data = retry.data;
    error = retry.error;

    if (!error && data?.id) {
      const patched = await admin
        .from("rent_entries")
        .update({ local_insights: insights })
        .eq("id", data.id);
      // If column still missing, insights live in verification_logs only.
      if (patched.error && !columnMissing(patched.error.message)) {
        return {
          id: data.id,
          insights,
          error: patched.error.message,
        };
      }
    }
  } else if (!error && data?.id) {
    // Ensure jsonb is written even when insert path succeeded without returning it.
    await admin
      .from("rent_entries")
      .update({ local_insights: insights })
      .eq("id", data.id);
  }

  if (error || !data?.id) {
    return {
      id: "",
      insights,
      error: error?.message ?? "Could not save rent entry.",
    };
  }

  return { id: data.id, insights, error: null };
}

export async function updateRentEntryWithInsights(
  admin: SupabaseClient,
  entryId: string,
  userId: string,
  input: PersistInput
): Promise<{ insights: LocalInsights; error: string | null }> {
  const insights = insightsFromPayload(input);
  const base = {
    location_id: input.locationId,
    bhk: input.bhk,
    monthly_rent: input.monthly_rent,
    maintenance: input.maintenance,
    carpet_area: input.carpet_area,
    floor_level: input.floor_level,
    furnishing: input.furnishing,
    total_units: input.total_units,
    has_lift: input.has_lift,
    has_parking: input.parking !== "no",
    parking: input.parking,
    power_backup: input.power_backup,
    metro_distance: input.metro_distance,
    internal_locality_avg: input.internal_locality_avg,
    scraped_external_avg: input.scraped_external_avg,
    verification_status: input.verification_status,
  };

  let { error } = await admin
    .from("rent_entries")
    .update({ ...base, local_insights: insights })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error && columnMissing(error.message)) {
    const retry = await admin
      .from("rent_entries")
      .update(base)
      .eq("id", entryId)
      .eq("user_id", userId);
    error = retry.error;
  }

  if (!error) {
    // Dedicated write so complaints are not dropped if a prior combined update skipped them.
    const insightPatch = await admin
      .from("rent_entries")
      .update({ local_insights: insights })
      .eq("id", entryId)
      .eq("user_id", userId);
    if (
      insightPatch.error &&
      !columnMissing(insightPatch.error.message)
    ) {
      return { insights, error: insightPatch.error.message };
    }
  }

  return { insights, error: error?.message ?? null };
}

export async function hydrateReviewsWithInsights<
  T extends { id: string; local_insights?: LocalInsights | null },
>(admin: SupabaseClient, reviews: T[]): Promise<T[]> {
  if (reviews.length === 0) return reviews;

  // Empty `{}` is truthy — must check for actual notes, not object presence.
  const needsHydration = reviews.some(
    (row) => !insightsHaveNotes(normalizeLocalInsights(row.local_insights))
  );
  if (!needsHydration) {
    return reviews.map((row) => ({
      ...row,
      local_insights: normalizeLocalInsights(row.local_insights),
    }));
  }

  const ids = reviews.map((row) => row.id);
  const { data: logs } = await admin
    .from("verification_logs")
    .select("rent_entry_id, details, created_at")
    .in("rent_entry_id", ids)
    .order("created_at", { ascending: false });

  const fromLogs = new Map<string, LocalInsights>();
  for (const log of logs ?? []) {
    const entryId = log.rent_entry_id as string | null;
    if (!entryId || fromLogs.has(entryId)) continue;
    const details = asDetails(log.details);
    const raw =
      details?.local_insights ??
      details?.insights ??
      details?.complaints ??
      null;
    const normalized = normalizeLocalInsights(raw);
    if (insightsHaveNotes(normalized) && normalized) {
      fromLogs.set(entryId, normalized);
    }
  }

  return reviews.map((row) => ({
    ...row,
    local_insights: pickInsights(
      normalizeLocalInsights(row.local_insights),
      fromLogs.get(row.id) ?? null
    ),
  }));
}

function asDetails(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

/** Load complaints/notes for a single rent entry (column + verification logs). */
export async function loadInsightsForEntry(
  admin: SupabaseClient,
  entryId: string,
  localInsights?: LocalInsights | null
): Promise<LocalInsights | null> {
  const [hydrated] = await hydrateReviewsWithInsights(admin, [
    { id: entryId, local_insights: localInsights ?? null },
  ]);
  return hydrated.local_insights ?? null;
}
