import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NewListingForm } from "@/components/listings/new-listing-form";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.role !== "owner") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="px-4 py-10">
        <NewListingForm />
      </main>
      <SiteFooter />
    </div>
  );
}
