"use client";

import { useMemo, useState } from "react";
import { Search, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InquiryDialog } from "@/components/messaging/inquiry-dialog";
import { formatINR } from "@/lib/format";
import type { ExternalListing, RentEntry, SearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SearchExperience({ enabled }: { enabled: boolean }) {
  const [building, setBuilding] = useState("");
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const [inquiry, setInquiry] = useState<{
    listingId?: string;
    externalRef?: string;
    buildingName: string;
  } | null>(null);

  async function search() {
    if (!enabled) return;
    if (!building.trim()) {
      toast.error("Enter a building name.");
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ building: building.trim() });
    if (bhk) params.set("bhk", bhk);
    if (furnishing) params.set("furnishing", furnishing);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    const response = await fetch(`/api/search?${params.toString()}`);
    const json = (await response.json()) as SearchResponse & { error?: string };
    setLoading(false);
    if (!response.ok) {
      toast.error(json.error ?? "Search blocked.");
      return;
    }
    setResult(json);
    const noInternal = (json.internal?.length ?? 0) === 0 && (json.listings?.length ?? 0) === 0;
    setShowExternal(false);
    setEmptyOpen(noInternal);
  }

  const stats = useMemo(() => {
    const rents = (result?.internal ?? []).map((row) => row.monthly_rent);
    if (rents.length === 0) return null;
    const sorted = [...rents].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return {
      avg: Math.round(rents.reduce((sum, value) => sum + value, 0) / rents.length),
      median:
        sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
          : sorted[mid]!,
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
    };
  }, [result]);

  if (!enabled) {
    return (
      <div className="ledger-card flex flex-col items-start gap-3 p-8">
        <ShieldBan className="size-6 text-brass" />
        <h1 className="font-serif text-3xl text-navy">Search is sealed.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Explorers and penalized accounts cannot query buildings. Contribute
          exact rent and property metadata to unlock the ledger.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-navy">Find a society.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Internal verified entries first. Vague broker ads from aggregators are
          dropped.
        </p>
      </div>
      <form
        className="ledger-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <div className="sm:col-span-2 lg:col-span-2">
          <Input
            className="h-11"
            placeholder="Building / society"
            value={building}
            onChange={(event) => setBuilding(event.target.value)}
          />
        </div>
        <select
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm"
          value={bhk}
          onChange={(event) => setBhk(event.target.value)}
        >
          <option value="">BHK</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4+</option>
        </select>
        <select
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm"
          value={furnishing}
          onChange={(event) => setFurnishing(event.target.value)}
        >
          <option value="">Furnishing</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi">Semi</option>
          <option value="fully">Fully</option>
        </select>
        <Input
          className="h-11"
          placeholder="Min ₹"
          value={minRent}
          onChange={(event) => setMinRent(event.target.value)}
        />
        <Input
          className="h-11"
          placeholder="Max ₹"
          value={maxRent}
          onChange={(event) => setMaxRent(event.target.value)}
        />
        <Button type="submit" className="h-11 rounded-full sm:col-span-2 lg:col-span-1" disabled={loading}>
          <Search className="size-4" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {stats && result?.building ? (
        <section className="ledger-card p-6">
          <p className="stamp-badge">Verified community data</p>
          <h2 className="mt-3 font-serif text-3xl text-navy">
            {result.building.building_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {result.building.area}, {result.building.city}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Avg", stats.avg],
              ["Median", stats.median],
              ["Min", stats.min],
              ["Max", stats.max],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-secondary p-3">
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </dt>
                <dd className="font-serif text-2xl">{formatINR(value as number)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="grid gap-3">
        {(result?.listings ?? []).map((listing) => (
          <ListingRow
            key={listing.id}
            title={listing.locations?.building_name ?? "Owner listing"}
            meta={`${listing.bhk} BHK · ${listing.furnishing} · ${formatINR(listing.asking_rent)}`}
            onInquiry={() =>
              setInquiry({
                listingId: listing.id,
                buildingName: listing.locations?.building_name ?? "Listing",
              })
            }
          />
        ))}
        {(result?.internal ?? []).map((entry) => (
          <CommunityRow key={entry.id} entry={entry} />
        ))}
      </div>

      {showExternal ? (
        <section className="space-y-3">
          <h3 className="font-serif text-2xl text-navy">Live aggregator cards</h3>
          {(result?.external ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No external listings available currently
            </p>
          ) : (
            result?.external.map((listing) => (
              <ExternalCard
                key={listing.id}
                listing={listing}
                onInquiry={() =>
                  setInquiry({
                    externalRef: `${listing.platform}:${listing.id}`,
                    buildingName: listing.building_name,
                  })
                }
              />
            ))
          )}
        </section>
      ) : null}

      <Dialog open={emptyOpen} onOpenChange={setEmptyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No community data yet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            We don&apos;t have community data for this building. Are you looking
            to rent here?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEmptyOpen(false)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                setShowExternal(true);
                setEmptyOpen(false);
              }}
            >
              Yes, show live listings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InquiryDialog
        open={Boolean(inquiry)}
        onOpenChange={(open) => {
          if (!open) setInquiry(null);
        }}
        listingId={inquiry?.listingId}
        externalRef={inquiry?.externalRef}
        buildingName={inquiry?.buildingName ?? ""}
      />
    </div>
  );
}

function CommunityRow({ entry }: { entry: RentEntry }) {
  return (
    <article className="ledger-card p-4 text-sm">
      <p className="font-medium text-navy">
        {entry.bhk} BHK · {entry.furnishing} · {formatINR(entry.monthly_rent)}
      </p>
      <p className="text-muted-foreground">
        {entry.carpet_area} sqft · {entry.floor_level} floor ·{" "}
        {entry.locations?.building_name}
      </p>
    </article>
  );
}

function ListingRow({
  title,
  meta,
  onInquiry,
}: {
  title: string;
  meta: string;
  onInquiry: () => void;
}) {
  return (
    <article className="ledger-card flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-serif text-xl text-navy">{title}</p>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </div>
      <Button size="sm" className="rounded-full" onClick={onInquiry}>
        Send inquiry to owner
      </Button>
    </article>
  );
}

function ExternalCard({
  listing,
  onInquiry,
}: {
  listing: ExternalListing;
  onInquiry: () => void;
}) {
  return (
    <article className={cn("ledger-card p-4", "border-l-4 border-l-sky-500")}>
      <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-sky-700">
        Listing via {listing.platform}
      </span>
      <p className="mt-2 font-serif text-xl text-navy">{listing.title}</p>
      <p className="text-sm text-muted-foreground">
        {listing.building_name} · {listing.area} ·{" "}
        {listing.monthly_rent ? formatINR(listing.monthly_rent) : "Rent on request"}
      </p>
      <Button size="sm" className="mt-3 rounded-full" onClick={onInquiry}>
        Send inquiry to owner
      </Button>
    </article>
  );
}
