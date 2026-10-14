"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InquiryDialog } from "@/components/messaging/inquiry-dialog";
import { formatINR } from "@/lib/format";
import type {
  ExternalListing,
  LocalInsights,
  LocationRow,
  PropertyListing,
  RentEntry,
  SearchResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function SearchExperience({ enabled }: { enabled: boolean }) {
  const [building, setBuilding] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationRow[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState<{
    listingId?: string;
    externalRef?: string;
    buildingName: string;
  } | null>(null);
  const skipSuggestRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const query = building.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(() => {
      void fetch(`/api/locations?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((json: { locations?: LocationRow[] }) => {
          const next = json.locations ?? [];
          setSuggestions(next);
          setShowSuggestions(next.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [building]);

  async function search(options?: {
    buildingName?: string;
    locationId?: string | null;
    external?: boolean;
  }) {
    if (!enabled) return;
    const query = (options?.buildingName ?? building).trim();
    const locationId = options?.locationId ?? selectedLocationId;
    if (!query && !locationId) {
      toast.message("Enter a place or community name.");
      return;
    }

    skipSuggestRef.current = true;
    setSuggestions([]);
    setShowSuggestions(false);
    if (query) setBuilding(query);
    setLoading(true);

    const params = new URLSearchParams();
    if (query) params.set("building", query);
    if (locationId) params.set("locationId", locationId);
    if (bhk) params.set("bhk", bhk);
    if (furnishing) params.set("furnishing", furnishing);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (options?.external) params.set("external", "1");

    const response = await fetch(`/api/search?${params.toString()}`);
    const json = (await response.json()) as SearchResponse & { error?: string };
    setLoading(false);
    if (!response.ok) {
      toast.message(json.error ?? "Search isn’t available right now.");
      return;
    }

    setResult(json);
    setExpandedId(json.reviews?.[0]?.id ?? json.listings?.[0]?.id ?? null);
    setShowExternal((json.external?.length ?? 0) > 0);
    const noCommunity =
      (json.reviews?.length ?? 0) === 0 &&
      (json.listings?.length ?? 0) === 0 &&
      (json.matches?.length ?? 0) === 0;
    setEmptyOpen(noCommunity);
  }

  function pickSuggestion(item: LocationRow) {
    skipSuggestRef.current = true;
    setSuggestions([]);
    setShowSuggestions(false);
    setBuilding(item.building_name);
    setSelectedLocationId(item.id);
    void search({ buildingName: item.building_name, locationId: item.id });
  }

  const stats = result?.stats ?? null;
  const matchedBuilding = result?.building;
  const reviews = useMemo(() => {
    const rows = result?.reviews ?? result?.internal ?? [];
    if (selectedLocationId) {
      return rows.filter((entry) => entry.location_id === selectedLocationId);
    }
    return rows;
  }, [result, selectedLocationId]);

  if (!enabled) {
    return (
      <div className="ledger-card flex flex-col items-start gap-3 p-8">
        <ShieldBan className="size-6 text-brass" />
        <h1 className="font-serif text-3xl text-navy">Search isn’t available yet.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Place and community search unlocks after you finish onboarding as an
          owner or renter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-navy">Find a place or community.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search a specific place or community, then expand a review for full
          details and complaints.
        </p>
      </div>

      <form
        className="ledger-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <div ref={wrapRef} className="relative sm:col-span-2 lg:col-span-2">
          <Input
            className="h-11"
            placeholder="Place or community name"
            value={building}
            onChange={(event) => {
              setSelectedLocationId(null);
              setBuilding(event.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card shadow-ledger">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickSuggestion(item)}
                >
                  <span className="font-medium text-navy">{item.building_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.area}, {item.city}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
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
        <Button
          type="submit"
          className="h-11 rounded-full sm:col-span-2 lg:col-span-1"
          disabled={loading}
        >
          <Search className="size-4" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {matchedBuilding ? (
        <section className="ledger-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="stamp-badge">
                {(result?.matches?.length ?? 0) > 0 ? "Matched place" : "Search result"}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-navy">
                {matchedBuilding.building_name}
              </h2>
              {matchedBuilding.area || matchedBuilding.city ? (
                <p className="text-sm text-muted-foreground">
                  {[matchedBuilding.area, matchedBuilding.city].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
            {stats ? (
              <div className="rounded-xl bg-secondary px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Typical rent
                </p>
                <p className="font-serif text-xl text-navy">{formatINR(stats.median)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatINR(stats.min)} – {formatINR(stats.max)} · {stats.count} verified
                </p>
              </div>
            ) : (
              <p className="max-w-xs text-sm text-muted-foreground">
                {(result?.pendingCount ?? 0) > 0
                  ? `${result?.pendingCount} review(s) awaiting admin verification.`
                  : "No verified rent ranges yet."}
              </p>
            )}
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-serif text-2xl text-navy">Resident reviews</h3>
          {reviews.map((entry) => (
            <CompactReview
              key={entry.id}
              entry={entry}
              open={expandedId === entry.id}
              onToggle={() =>
                setExpandedId((current) => (current === entry.id ? null : entry.id))
              }
            />
          ))}
        </section>
      ) : matchedBuilding && matchedBuilding.id !== "query" ? (
        <p className="text-sm text-muted-foreground">No resident reviews for this place yet.</p>
      ) : null}

      {(result?.listings?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h3 className="font-serif text-2xl text-navy">Owner listings</h3>
          {result!.listings.map((listing) => (
            <CompactListing
              key={listing.id}
              listing={listing}
              open={expandedId === listing.id}
              onToggle={() =>
                setExpandedId((current) => (current === listing.id ? null : listing.id))
              }
              onInquiry={() =>
                setInquiry({
                  listingId: listing.id,
                  buildingName: listing.locations?.building_name ?? "Listing",
                })
              }
            />
          ))}
        </section>
      ) : null}

      {showExternal && (result?.external?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h3 className="font-serif text-2xl text-navy">Live aggregator cards</h3>
          {result!.external.map((listing) => (
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
          ))}
        </section>
      ) : null}

      <Dialog open={emptyOpen} onOpenChange={setEmptyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No community data yet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            We don&apos;t have this building in our directory yet. Show live listings?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEmptyOpen(false)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                setEmptyOpen(false);
                void search({ external: true });
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

function pickText(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeInsights(raw: unknown): LocalInsights | null {
  if (!raw) return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  return {
    problems_faced: pickText(obj, [
      "problems_faced",
      "problems",
      "complaints",
      "complaint",
    ]),
    hurdles: pickText(obj, ["hurdles", "hurdle"]),
    local_politics: pickText(obj, [
      "local_politics",
      "politics",
      "society_dynamics",
    ]),
    legal_issues: pickText(obj, ["legal_issues", "legal", "litigation"]),
    distance_metro_km:
      typeof obj.distance_metro_km === "number" ? obj.distance_metro_km : null,
    distance_railway_km:
      typeof obj.distance_railway_km === "number" ? obj.distance_railway_km : null,
    distance_airport_km:
      typeof obj.distance_airport_km === "number" ? obj.distance_airport_km : null,
  };
}

function noteItems(insights?: LocalInsights | null) {
  if (!insights) return [];
  return [
    ["Problems", insights.problems_faced],
    ["Hurdles", insights.hurdles],
    ["Society / politics", insights.local_politics],
    ["Legal", insights.legal_issues],
  ].filter(([, value]) => Boolean(value?.trim())) as Array<[string, string]>;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function CompactReview({
  entry,
  open,
  onToggle,
}: {
  entry: RentEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const insights = normalizeInsights(entry.local_insights);
  const notes = noteItems(insights);
  const verified = entry.verification_status === "auto_approved";
  const metro = insights?.distance_metro_km ?? entry.metro_distance;

  return (
    <article className="ledger-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy">
            {entry.bhk} BHK · {formatINR(entry.monthly_rent)} · {formatLabel(entry.furnishing)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {entry.carpet_area} sqft · maint {formatINR(entry.maintenance ?? 0)}
            {notes.length > 0 ? ` · ${notes.length} note${notes.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            verified ? "bg-teal/15 text-teal-700" : "bg-brass/15 text-brass"
          )}
        >
          {verified ? "Verified" : "Pending"}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border bg-secondary/40 px-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Floor: </span>
              {formatLabel(entry.floor_level)}
            </p>
            <p>
              <span className="text-muted-foreground">Units: </span>
              {entry.total_units}
            </p>
            <p>
              <span className="text-muted-foreground">Lift: </span>
              {entry.has_lift ? "Yes" : "No"}
            </p>
            <p>
              <span className="text-muted-foreground">Parking: </span>
              {formatLabel(entry.parking)}
            </p>
            <p>
              <span className="text-muted-foreground">Backup: </span>
              {formatLabel(entry.power_backup)}
            </p>
            <p>
              <span className="text-muted-foreground">Metro: </span>
              {metro != null ? `${metro} km` : "—"}
            </p>
            {insights?.distance_railway_km != null ? (
              <p>
                <span className="text-muted-foreground">Railway: </span>
                {insights.distance_railway_km} km
              </p>
            ) : null}
            {insights?.distance_airport_km != null ? (
              <p>
                <span className="text-muted-foreground">Airport: </span>
                {insights.distance_airport_km} km
              </p>
            ) : null}
          </div>
          {notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                    {label}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-navy">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No problems / hurdles notes on this review.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function CompactListing({
  listing,
  open,
  onToggle,
  onInquiry,
}: {
  listing: PropertyListing;
  open: boolean;
  onToggle: () => void;
  onInquiry: () => void;
}) {
  return (
    <article className="ledger-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy">
            Owner · {listing.bhk} BHK · {formatINR(listing.asking_rent)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatLabel(listing.furnishing)}
            {listing.carpet_area != null ? ` · ${listing.carpet_area} sqft` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border bg-secondary/40 px-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Maintenance: </span>
              {formatLabel(listing.maintenance_status)}
            </p>
            <p>
              <span className="text-muted-foreground">Maint. amt: </span>
              {listing.maintenance_amount != null
                ? formatINR(listing.maintenance_amount)
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Pets: </span>
              {formatLabel(listing.pet_friendly)}
            </p>
            <p>
              <span className="text-muted-foreground">Floor: </span>
              {listing.floor_number ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Age: </span>
              {listing.building_age_years != null
                ? `${listing.building_age_years} yrs`
                : "—"}
            </p>
            <p className="sm:col-span-3">
              <span className="text-muted-foreground">Facilities: </span>
              {listing.facilities?.length ? listing.facilities.join(", ") : "—"}
            </p>
          </div>
          {listing.pet_case_notes?.trim() ? (
            <p className="text-xs leading-relaxed">
              <span className="font-semibold text-teal-700">Pet notes: </span>
              {listing.pet_case_notes}
            </p>
          ) : null}
          <Button size="sm" className="rounded-full" onClick={onInquiry}>
            Send inquiry to owner
          </Button>
        </div>
      ) : null}
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
    <article className="ledger-card flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
          {listing.platform}
        </p>
        <p className="text-sm font-medium text-navy">{listing.title}</p>
        <p className="text-xs text-muted-foreground">
          {listing.building_name} ·{" "}
          {listing.monthly_rent ? formatINR(listing.monthly_rent) : "Rent on request"}
        </p>
      </div>
      <Button size="sm" className="rounded-full" onClick={onInquiry}>
        Inquire
      </Button>
    </article>
  );
}
