import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (profile?.onboarding_completed) redirect("/dashboard");

  const phone =
    user.phone ||
    (typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : "");

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      {/* Phone is passed for silent form submit only — never rendered in the UI. */}
      <OnboardingWizard initialPhone={phone} />
    </div>
  );
}
