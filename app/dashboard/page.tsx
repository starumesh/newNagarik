import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UnlockBanner } from "@/components/unlock-banner";
import { ExplorerDashboard } from "@/components/dashboard/explorer-dashboard";
import { VerifiedDashboard } from "@/components/dashboard/verified-dashboard";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { canAccessGranularData } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { PropertyListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const verified = canAccessGranularData(profile);
  let listings: PropertyListing[] = [];
  if (profile.role === "owner") {
    const supabase = createClient();
    const { data } = await supabase
      .from("property_listings")
      .select("*, locations(*)")
      .eq("owner_id", user.id)
      .limit(15);
    listings = (data as PropertyListing[] | null) ?? [];
  }

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-10">
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
      {!verified ? <UnlockBanner /> : null}
      <SiteFooter />
    </div>
  );
}
