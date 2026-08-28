"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatINR, titleCase } from "@/lib/format";
import type { ExternalListing, RentEntry } from "@/lib/types";

type QueueEntry = RentEntry & {
  verification_logs?: Array<{
    pillar_1_passed: boolean;
    pillar_2_passed: boolean;
    pillar_3_passed: boolean;
    pillar_4_passed: boolean;
    details: Record<string, unknown>;
  }>;
};

export function VerificationPanel() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [selected, setSelected] = useState<QueueEntry | null>(null);
  const [external, setExternal] = useState<ExternalListing[]>([]);
  const [externalNote, setExternalNote] = useState("");

  async function load() {
    const response = await fetch("/api/admin/entries");
    if (!response.ok) {
      toast.error("Admin session missing.");
      return;
    }
    const json = await response.json();
    setEntries(json.entries ?? []);
    setSelected((json.entries ?? [])[0] ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selected?.locations) {
      setExternal([]);
      return;
    }
    const loc = selected.locations;
    void fetch(
      `/api/external-listings?city=${encodeURIComponent(loc.city)}&area=${encodeURIComponent(loc.area)}&building=${encodeURIComponent(loc.building_name)}`
    )
      .then(async (response) => {
        const json = await response.json();
        setExternal(json.listings ?? []);
        setExternalNote(
          json.listings?.length
            ? ""
            : "No external listings available currently"
        );
      })
      .catch(() => {
        setExternal([]);
        setExternalNote("No external listings available currently");
      });
  }, [selected]);

  async function review(action: "approve" | "reject") {
    if (!selected) return;
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: selected.id, action }),
    });
    if (!response.ok) {
      toast.error("Action failed.");
      return;
    }
    toast.success(action === "approve" ? "Entry published." : "User banned.");
    await load();
  }

  const log = selected?.verification_logs?.[0];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="ledger-card p-4">
        <h2 className="font-serif text-2xl text-navy">Under review</h2>
        <div className="mt-4 space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is clear.</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelected(entry)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                  selected?.id === entry.id
                    ? "border-teal bg-accent"
                    : "border-border"
                }`}
              >
                <span className="block font-medium">
                  {entry.locations?.building_name} · {formatINR(entry.monthly_rent)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.bhk} BHK · {entry.carpet_area} sqft
                </span>
              </button>
            ))
          )}
        </div>
        {selected ? (
          <div className="mt-6 space-y-2 text-sm">
            <h3 className="font-serif text-xl">Submitted metadata</h3>
            <p>Rent {formatINR(selected.monthly_rent)} + maint {formatINR(selected.maintenance)}</p>
            <p>Carpet {selected.carpet_area} · Floor {titleCase(selected.floor_level)}</p>
            <p>Furnishing {selected.furnishing} · Units {selected.total_units}</p>
            <p>Lift {selected.has_lift ? "yes" : "no"} · Parking {selected.parking}</p>
            <p>Backup {selected.power_backup} · Metro {selected.metro_distance} km</p>
            {log ? (
              <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {([
                  ["Identity", log.pillar_1_passed],
                  ["Structure", log.pillar_2_passed],
                  ["Internal DB", log.pillar_3_passed],
                  ["External", log.pillar_4_passed],
                ] as const).map(([label, passed]) => (
                  <li
                    key={label}
                    className={passed ? "text-teal-700" : "text-brass"}
                  >
                    {label}: {passed ? "pass" : "flag"}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button className="rounded-full" onClick={() => review("approve")}>
                Approve entry
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                onClick={() => review("reject")}
              >
                Reject &amp; ban user
              </Button>
            </div>
          </div>
        ) : null}
      </section>
      <section className="ledger-card p-4">
        <h2 className="font-serif text-2xl text-navy">Aggregator cards</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cached 24h · NoBroker, 99acres, MyGate, MagicBricks, Anacity
        </p>
        <div className="mt-4 space-y-3">
          {external.length === 0 ? (
            <p className="text-sm text-muted-foreground">{externalNote}</p>
          ) : (
            external.map((listing) => (
              <article key={listing.id} className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  Listing via {listing.platform}
                </span>
                <p className="mt-1 font-medium">{listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  {listing.monthly_rent ? formatINR(listing.monthly_rent) : "—"} ·{" "}
                  {listing.building_name}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
