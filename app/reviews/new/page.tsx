import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RentalReviewForm } from "@/components/reviews/rental-review-form";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewRentalReviewPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");
  if (profile.role === "owner") redirect("/dashboard");

  const phone =
    user.phone ||
    (typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : "");

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="px-4 py-10">
        <RentalReviewForm mode="create" phone={phone} />
      </main>
      <SiteFooter />
    </div>
  );
}
