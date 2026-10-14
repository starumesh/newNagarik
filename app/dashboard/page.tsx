import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UnlockBanner } from "@/components/unlock-banner";
import { AccountStatusBanner } from "@/components/account-status-banner";
import { ExplorerDashboard } from "@/components/dashboard/explorer-dashboard";
import { VerifiedDashboard } from "@/components/dashboard/verified-dashboard";
import { RenterReviewsSection } from "@/components/dashboard/renter-reviews-section";
import { TrustScoreDisplay } from "@/components/trust-badge";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { canAccessGranularData } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  PENDING_TRUST_SCORE,
  isVerifiedTrust,
} from "@/lib/trust";
import { hydrateReviewsWithInsights } from "@/lib/rent-entry-persist";
import type { PropertyListing, RentEntry, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, profile: rawProfile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!rawProfile?.onboarding_completed) redirect("/onboarding");

  let profile: UserProfile = rawProfile;
  // Keep pending renters at 50 (older accounts may still store intention-boosted scores).
  if (
    profile.role === "renter" &&
    !isVerifiedTrust(profile.trust_score) &&
    profile.trust_score !== PENDING_TRUST_SCORE
  ) {
    const admin = createAdminClient();
    await admin
      .from("user_profiles")
      .update({ trust_score: PENDING_TRUST_SCORE })
      .eq("id", user.id);
    profile = { ...profile, trust_score: PENDING_TRUST_SCORE };
  }

  const verified = canAccessGranularData(profile);
  let listings: PropertyListing[] = [];
  let reviews: RentEntry[] = [];

  if (profile.role === "owner") {
    const supabase = createClient();
    const { data } = await supabase
      .from("property_listings")
      .select("*, locations(*)")
      .eq("owner_id", user.id)
      .limit(15);
    listings = (data as PropertyListing[] | null) ?? [];
  }

  if (profile.role === "renter") {
    const admin = createAdminClient();
    const { data } = await admin
      .from("rent_entries")
      .select("*, locations(*)")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: true })
      .limit(30);
    reviews = await hydrateReviewsWithInsights(
      admin,
      (data as RentEntry[] | null) ?? []
    );
  }

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <AccountStatusBanner profile={profile} />
        {!verified ? (
          <section className="mb-6 ledger-card p-4">
            <TrustScoreDisplay score={profile.trust_score} />
          </section>
        ) : null}
        {profile.role === "renter" ? (
          <RenterReviewsSection reviews={reviews} />
        ) : null}
        {verified ? (
          <VerifiedDashboard
            profile={profile}
            city={profile.home_city}
            listings={listings}
          />
        ) : (
          <ExplorerDashboard homeCity={profile.home_city} />
        )}
      </main>
      {!verified && profile.role !== "owner" ? <UnlockBanner /> : null}
      <SiteFooter />
    </div>
  );
}
