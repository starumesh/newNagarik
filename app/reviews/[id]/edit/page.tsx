import { redirect, notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  RentalReviewForm,
  type RentalReviewInitial,
} from "@/components/reviews/rental-review-form";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadInsightsForEntry } from "@/lib/rent-entry-persist";
import type { RentEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditRentalReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const admin = createAdminClient();
  const { data } = await admin
    .from("rent_entries")
    .select("*, locations(*)")
    .eq("id", params.id)
    .maybeSingle();

  const entry = data as RentEntry | null;
  if (!entry || entry.user_id !== user.id) notFound();

  const insights =
    (await loadInsightsForEntry(admin, entry.id, entry.local_insights)) ?? {};

  const initial: RentalReviewInitial = {
    city: entry.locations?.city ?? "",
    area: entry.locations?.area ?? "",
    building_name: entry.locations?.building_name ?? "",
    monthly_rent: entry.monthly_rent,
    maintenance: entry.maintenance,
    carpet_area: entry.carpet_area,
    bhk: entry.bhk,
    floor_level: entry.floor_level,
    furnishing: entry.furnishing,
    total_units: entry.total_units,
    has_lift: entry.has_lift,
    parking: entry.parking,
    power_backup: entry.power_backup,
    metro_distance_km:
      insights.distance_metro_km ?? entry.metro_distance ?? null,
    railway_distance_km: insights.distance_railway_km ?? null,
    airport_distance_km: insights.distance_airport_km ?? null,
    problems_faced: insights.problems_faced ?? "",
    hurdles: insights.hurdles ?? "",
    local_politics: insights.local_politics ?? "",
    legal_issues: insights.legal_issues ?? "",
  };

  const phone =
    user.phone ||
    (typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : "");

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="px-4 py-10">
        <RentalReviewForm
          key={entry.id}
          mode="edit"
          entryId={entry.id}
          phone={phone}
          initial={initial}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
