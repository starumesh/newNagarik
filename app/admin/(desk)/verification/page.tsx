import { VerificationPanel } from "@/components/admin/verification-panel";

export const dynamic = "force-dynamic";

export default function AdminVerificationPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-cream">Rental reviews</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Status at the top. Edit in its own tab. Hide and delete stay on the
        review.
      </p>
      <div className="mt-6">
        <VerificationPanel />
      </div>
    </div>
  );
}
