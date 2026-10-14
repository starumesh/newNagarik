import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessSearch } from "@/lib/access";
import { columnMissing, isCatalogSentinel } from "@/lib/catalog";
import { readAdminMeta, stripAdminMeta } from "@/lib/admin-meta";
import { hydrateReviewsWithInsights } from "@/lib/rent-entry-persist";
import type { RentEntry, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function buildStats(rents: number[]) {
  if (rents.length === 0) return undefined;
  return {
    avg: Math.round(rents.reduce((sum, value) => sum + value, 0) / rents.length),
    median: median(rents),
    min: Math.min(...rents),
    max: Math.max(...rents),
    count: rents.length,
  };
}

function sortReviews(rows: RentEntry[]) {
  return [...rows].sort((a, b) => {
    const rank = (status: string) =>
      status === "auto_approved" ? 0 : status === "under_review" ? 1 : 2;
    const byStatus = rank(a.verification_status) - rank(b.verification_status);
    if (byStatus !== 0) return byStatus;
    return (
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
  });
}

export async function GET(request: NextRequest) {
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

  if (!canAccessSearch(profile as UserProfile | null)) {
    return NextResponse.json(
      { error: "Search unlocks after you finish onboarding as an owner or renter." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const building = searchParams.get("building")?.trim();
  const locationId = searchParams.get("locationId")?.trim();
  const bhk = searchParams.get("bhk");
  const furnishing = searchParams.get("furnishing");
  const minRent = searchParams.get("minRent");
  const maxRent = searchParams.get("maxRent");
  const includeExternal = searchParams.get("external") === "1";

  if (!building && !locationId) {
    return NextResponse.json(
      { error: "Enter a place or community name." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  let matches: Array<{
    id: string;
    city: string;
    area: string;
    building_name: string;
    is_enabled?: boolean;
  }> = [];

  if (locationId) {
    const { data: exact, error } = await admin
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "Could not search places." }, { status: 500 });
    }
    if (exact) matches = [exact];
  }

  if (matches.length === 0 && building) {
    const { data: locations, error: locationError } = await admin
      .from("locations")
      .select("*")
      .ilike("building_name", `%${building}%`)
      .limit(15);
    if (locationError) {
      return NextResponse.json({ error: "Could not search places." }, { status: 500 });
    }
    matches = locations ?? [];
  }

  matches = matches.filter(
    (row) => !isCatalogSentinel(row) && row.is_enabled !== false
  );

  const primary = matches[0];
  const locationIds = matches.map((row) => row.id);

  if (locationIds.length === 0) {
    return NextResponse.json({
      query: building ?? "",
      matches: [],
      building: {
        id: "query",
        city: "",
        area: "",
        building_name: building ?? "",
      },
      internal: [],
      reviews: [],
      listings: [],
      external: [],
      pendingCount: 0,
      stats: undefined,
    });
  }

  let reviewsQuery = admin
    .from("rent_entries")
    .select("*, locations(*)")
    .in("location_id", locationIds)
    .in("verification_status", ["auto_approved", "under_review"])
    .eq("is_hidden", false)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (bhk) reviewsQuery = reviewsQuery.eq("bhk", Number(bhk));
  if (furnishing) reviewsQuery = reviewsQuery.eq("furnishing", furnishing);
  if (minRent) reviewsQuery = reviewsQuery.gte("monthly_rent", Number(minRent));
  if (maxRent) reviewsQuery = reviewsQuery.lte("monthly_rent", Number(maxRent));

  const [reviewsResult, listingsResult] = await Promise.all([
    reviewsQuery,
    admin
      .from("property_listings")
      .select("*, locations(*)")
      .in("location_id", locationIds)
      .eq("is_active", true)
      .limit(15),
  ]);

  let reviewRows = reviewsResult.data;
  let reviewError = reviewsResult.error;

  if (reviewError && columnMissing(reviewError.message)) {
    let retryQuery = admin
      .from("rent_entries")
      .select("*, locations(*)")
      .in("location_id", locationIds)
      .in("verification_status", ["auto_approved", "under_review"])
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (bhk) retryQuery = retryQuery.eq("bhk", Number(bhk));
    if (furnishing) retryQuery = retryQuery.eq("furnishing", furnishing);
    if (minRent) retryQuery = retryQuery.gte("monthly_rent", Number(minRent));
    if (maxRent) retryQuery = retryQuery.lte("monthly_rent", Number(maxRent));
    const retry = await retryQuery;
    reviewRows = retry.data;
    reviewError = retry.error;
  }

  if (reviewError) {
    return NextResponse.json(
      {
        error: "Could not load rental reviews for this place.",
        detail: reviewError.message,
      },
      { status: 500 }
    );
  }

  const reviews = await hydrateReviewsWithInsights(
    admin,
    sortReviews((reviewRows ?? []) as RentEntry[])
  ).then((rows) =>
    rows
      .filter((row) => !readAdminMeta(row.local_insights).hidden)
      .map((row) => stripAdminMeta(row))
  );
  const approved = reviews.filter(
    (row) => row.verification_status === "auto_approved"
  );
  const pendingCount = reviews.filter(
    (row) => row.verification_status === "under_review"
  ).length;

  let external: unknown[] = [];
  if (includeExternal && approved.length === 0) {
    const { getExternalListings } = await import("@/lib/scrapers");
    const scraped = await getExternalListings({
      city: primary!.city,
      area: primary!.area,
      building_name: primary!.building_name,
    });
    external = scraped.listings;
  }

  return NextResponse.json({
    query: building ?? primary!.building_name,
    matches,
    building: primary,
    internal: approved,
    reviews,
    listings: listingsResult.data ?? [],
    external,
    pendingCount,
    stats: buildStats(approved.map((row) => row.monthly_rent)),
  });
}
