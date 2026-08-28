import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InboxClient } from "@/components/messaging/inbox-client";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <InboxClient userId={user.id} />
      </main>
      <SiteFooter />
    </div>
  );
}
