import { AggregatorPanel } from "@/components/admin/aggregator-panel";

export const dynamic = "force-dynamic";

export default function AdminListingsPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-cream">Owner listings</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Owner posts from the last 14 days on NoBroker and MagicBricks, with
        BHK and rent taken from the listing itself. Cards open the source page.
      </p>
      <div className="mt-6">
        <AggregatorPanel />
      </div>
    </div>
  );
}
