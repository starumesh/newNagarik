import { PlacesPanel } from "@/components/admin/places-panel";

export const dynamic = "force-dynamic";

export default function AdminPlacesPage() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brass">
        Catalog
      </p>
      <h1 className="mt-2 font-serif text-4xl text-cream">Places</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Add or disable cities, areas, societies, communities, and buildings.
        Disabled cities drop out of onboarding and search.
      </p>
      <div className="mt-8">
        <PlacesPanel />
      </div>
    </div>
  );
}
