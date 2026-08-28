import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <OnboardingWizard />
    </div>
  );
}
