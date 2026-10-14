import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UnlockBanner } from "@/components/unlock-banner";
import { SearchExperience } from "@/components/search/search-experience";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { canAccessSearch } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");
  const canSearch = canAccessSearch(profile);

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SearchExperience enabled={canSearch} />
      </main>
      {!canSearch ? <UnlockBanner /> : null}
      <SiteFooter />
    </div>
  );
}
