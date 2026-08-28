import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminGate } from "@/components/admin/admin-gate";
import { VerificationPanel } from "@/components/admin/verification-panel";
import { isAdminRequest } from "@/lib/admin";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminVerificationPage() {
  const { profile } = await getCurrentUserAndProfile();
  const unlocked = isAdminRequest();

  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={profile} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        {unlocked ? (
          <VerificationPanel />
        ) : (
          <AdminGate>
            <VerificationPanel />
          </AdminGate>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
