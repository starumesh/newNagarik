"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { ReviewControls } from "@/components/admin/review-controls";
import { Button } from "@/components/ui/button";
import { formatINR, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExternalListing, RentEntry, VerificationStatus } from "@/lib/types";

type QueueEntry = RentEntry & {
  verification_logs?: Array<{
    pillar_1_passed: boolean;
    pillar_2_passed: boolean;
    pillar_3_passed: boolean;
    pillar_4_passed: boolean;
    details: Record<string, unknown>;
  }>;
};

type StageFilter = "all" | VerificationStatus | "hidden";
type ReviewAction = "approve" | "reject" | "reopen";
type DeskTab = "overview" | "edit" | "market";

const STAGES: { id: StageFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "under_review", label: "Pending" },
  { id: "auto_approved", label: "Verified" },
  { id: "rejected", label: "Rejected" },
  { id: "hidden", label: "Hidden" },
];

const STATUS_OPTIONS: {
  id: VerificationStatus;
  label: string;
  hint: string;
}[] = [
  { id: "under_review", label: "Pending", hint: "Waiting on a decision" },
  { id: "auto_approved", label: "Verified", hint: "Live on search" },
  { id: "rejected", label: "Rejected", hint: "Held back · limits account" },
];

function stageLabel(status: VerificationStatus) {
  if (status === "auto_approved") return "Verified";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function stageClass(status: VerificationStatus) {
  if (status === "auto_approved") return "bg-teal/20 text-teal-200";
  if (status === "rejected") return "bg-red-500/20 text-red-300";
  return "bg-brass/20 text-brass";
}

function submittedLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function actionForStatus(
  current: VerificationStatus,
  next: VerificationStatus
): ReviewAction | null {
  if (current === next) return null;
  if (next === "auto_approved") return "approve";
  if (next === "rejected") return "reject";
  return "reopen";
}

export function VerificationPanel() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    under_review: 0,
    auto_approved: 0,
    rejected: 0,
    hidden: 0,
  });
  const [stage, setStage] = useState<StageFilter>("all");
  const [selected, setSelected] = useState<QueueEntry | null>(null);
  const [external, setExternal] = useState<ExternalListing[]>([]);
  const [externalNote, setExternalNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [tab, setTab] = useState<DeskTab>("overview");
  const [confirmReject, setConfirmReject] = useState(false);

  const visible = useMemo(() => {
    if (stage === "all") return entries;
    if (stage === "hidden") return entries.filter((entry) => entry.is_hidden);
    return entries.filter((entry) => entry.verification_status === stage);
  }, [entries, stage]);
  const displayed =
    visible.find((entry) => entry.id === selected?.id) ?? visible[0] ?? null;

  async function load(preferredId?: string) {
    const response = await fetch("/api/admin/entries");
    if (!response.ok) {
      setLoading(false);
      toast.error("Admin session missing.");
      return;
    }
    const json = await response.json();
    const next = (json.entries ?? []) as QueueEntry[];
    setEntries(next);
    setCounts(
      json.counts ?? {
        all: next.length,
        under_review: next.filter((row) => row.verification_status === "under_review")
          .length,
        auto_approved: next.filter(
          (row) => row.verification_status === "auto_approved"
        ).length,
        rejected: next.filter((row) => row.verification_status === "rejected").length,
        hidden: next.filter((row) => row.is_hidden).length,
      }
    );
    const keepId = preferredId ?? selected?.id;
    const stillThere = next.find((row) => row.id === keepId);
    setSelected(stillThere ?? next[0] ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTab("overview");
    setConfirmReject(false);
  }, [displayed?.id]);

  useEffect(() => {
    if (!displayed?.locations) {
      setExternal([]);
      setExternalNote("");
      return;
    }
    const loc = displayed.locations;
    void fetch(
      `/api/external-listings?city=${encodeURIComponent(loc.city)}&area=${encodeURIComponent(loc.area)}&building=${encodeURIComponent(loc.building_name)}`
    )
      .then(async (response) => {
        const json = await response.json();
        setExternal(json.listings ?? []);
        setExternalNote(
          json.listings?.length ? "" : "No cached aggregator listings for this building."
        );
      })
      .catch(() => {
        setExternal([]);
        setExternalNote("No cached aggregator listings for this building.");
      });
  }, [
    displayed?.id,
    displayed?.locations?.city,
    displayed?.locations?.area,
    displayed?.locations?.building_name,
  ]);

  async function review(action: ReviewAction) {
    if (!displayed || acting) return;
    setActing(true);
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: displayed.id, action }),
    });
    setActing(false);
    setConfirmReject(false);
    if (!response.ok) {
      toast.error("Could not change status.");
      return;
    }
    toast.success(
      action === "approve"
        ? "Marked verified — live on search."
        : action === "reopen"
          ? "Moved back to pending."
          : "Rejected. The contributor is limited for 6 months."
    );
    await load(displayed.id);
  }

  async function setStatus(next: VerificationStatus) {
    if (!displayed) return;
    const action = actionForStatus(displayed.verification_status, next);
    if (!action) return;
    if (action === "reject") {
      setConfirmReject(true);
      return;
    }
    await review(action);
  }

  async function toggleHidden() {
    if (!displayed) return;
    setActing(true);
    const response = await fetch(`/api/admin/entries/${displayed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: !displayed.is_hidden }),
    });
    setActing(false);
    if (!response.ok) {
      toast.error("Could not update visibility.");
      return;
    }
    toast.success(
      displayed.is_hidden ? "Visible on search again." : "Hidden from search."
    );
    await load(displayed.id);
  }

  async function remove() {
    if (!displayed) return;
    if (!window.confirm("Delete this review permanently? This cannot be undone.")) {
      return;
    }
    setActing(true);
    const response = await fetch(`/api/admin/entries/${displayed.id}`, {
      method: "DELETE",
    });
    setActing(false);
    if (!response.ok) {
      toast.error("Could not delete.");
      return;
    }
    toast.success("Review deleted.");
    await load();
  }

  const log = displayed?.verification_logs?.[0];
  const selectedStatus = displayed?.verification_status;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-[#121a2a] p-4 lg:sticky lg:top-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Queue
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStage(item.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                stage === item.id
                  ? "bg-brass text-navy"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-cream"
              )}
            >
              {item.label}
              <span className="ml-1 tabular-nums opacity-80">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-[calc(100vh-12rem)] space-y-1.5 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-slate-500">Loading reviews…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-slate-500">
              {stage === "all"
                ? "No rental reviews yet."
                : stage === "under_review"
                  ? "Nothing pending."
                  : stage === "auto_approved"
                    ? "Nothing verified."
                    : stage === "hidden"
                      ? "Nothing hidden."
                      : "Nothing rejected."}
            </p>
          ) : (
            visible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelected(entry)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-left",
                  displayed?.id === entry.id
                    ? "border-brass/60 bg-brass/10"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="block text-sm font-medium text-cream">
                    {entry.locations?.building_name ?? "Unknown building"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      stageClass(entry.verification_status)
                    )}
                  >
                    {stageLabel(entry.verification_status)}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {formatINR(entry.monthly_rent)} · {entry.bhk} BHK
                  {entry.locations?.area ? ` · ${entry.locations.area}` : ""}
                </span>
                {entry.is_hidden ? (
                  <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-slate-500">
                    Hidden
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#121a2a]">
        {!displayed ? (
          <div className="p-8 text-sm text-slate-500">Select a review from the queue.</div>
        ) : (
          <>
            <header className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-3xl text-cream">
                    {displayed.locations?.building_name ?? "Unknown building"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {displayed.locations?.area}
                    {displayed.locations?.city ? ` · ${displayed.locations.city}` : ""}
                    {" · "}
                    {displayed.bhk} BHK · {formatINR(displayed.monthly_rent)}
                    {displayed.submitted_at
                      ? ` · ${submittedLabel(displayed.submitted_at)}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-cream">
                    {displayed.reviewer?.phone ?? "Phone not on file"}
                    {displayed.admin_score
                      ? ` · Score ${displayed.admin_score}/10`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
                    disabled={acting}
                    onClick={() => void toggleHidden()}
                  >
                    {displayed.is_hidden ? (
                      <Eye className="size-3.5" />
                    ) : (
                      <EyeOff className="size-3.5" />
                    )}
                    {displayed.is_hidden ? "Unhide" : "Hide"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-full"
                    disabled={acting}
                    onClick={() => void remove()}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
                  {STATUS_OPTIONS.map((option) => {
                    const active = selectedStatus === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={acting || active}
                        onClick={() => void setStatus(option.id)}
                        className={cn(
                          "rounded-lg px-2 py-2 text-center text-sm font-semibold transition",
                          active
                            ? option.id === "auto_approved"
                              ? "bg-teal/30 text-teal-100"
                              : option.id === "rejected"
                                ? "bg-red-500/30 text-red-100"
                                : "bg-brass text-navy"
                            : "text-slate-400 hover:bg-white/5 hover:text-cream"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {STATUS_OPTIONS.find((item) => item.id === selectedStatus)?.hint}
                  {" · "}
                  Click another status to move this review.
                </p>
                {confirmReject ? (
                  <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3">
                    <p className="text-sm text-red-100">
                      Reject this review? Search will hide it and the contributor
                      is limited for 6 months.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="destructive"
                        className="rounded-full"
                        disabled={acting}
                        onClick={() => void review("reject")}
                      >
                        Confirm reject
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
                        onClick={() => setConfirmReject(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </header>

            <div className="flex gap-1 border-b border-white/10 px-5 pt-3">
              {(
                [
                  ["overview", "Overview"],
                  ["edit", "Edit"],
                  ["market", "Market"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-t-lg px-3 py-2 text-sm font-medium",
                    tab === id
                      ? "bg-white/10 text-cream"
                      : "text-slate-500 hover:text-cream"
                  )}
                >
                  {id === "edit" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Pencil className="size-3.5" />
                      {label}
                    </span>
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              {tab === "overview" ? (
                <Overview
                  entry={displayed}
                  log={log}
                  onEdit={() => setTab("edit")}
                />
              ) : null}
              {tab === "edit" ? (
                <ReviewControls
                  entry={displayed}
                  acting={acting}
                  onRefresh={load}
                />
              ) : null}
              {tab === "market" ? (
                <MarketList listings={external} note={externalNote} />
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Overview({
  entry,
  log,
  onEdit,
}: {
  entry: QueueEntry;
  log?: QueueEntry["verification_logs"] extends (infer T)[] | undefined ? T : never;
  onEdit: () => void;
}) {
  const facts: [string, string][] = [
    ["Rent", `${formatINR(entry.monthly_rent)} + maint ${formatINR(entry.maintenance)}`],
    ["Layout", `${entry.bhk} BHK · ${entry.carpet_area} sqft · ${titleCase(entry.floor_level)}`],
    ["Furnishing", titleCase(entry.furnishing)],
    ["Society size", entry.total_units],
    ["Lift", entry.has_lift ? "Yes" : "No"],
    ["Parking", titleCase(entry.parking)],
    ["Backup", titleCase(entry.power_backup)],
    ["Metro", entry.metro_distance != null ? `${entry.metro_distance} km` : "—"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Submitted details
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          Edit numbers
        </Button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm text-cream">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">
          Reviewer
        </p>
        <p className="mt-2 text-sm text-cream">
          {entry.reviewer?.phone ?? "Phone not on file"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {entry.reviewer?.email ?? "Phone login · no public email"}
          {entry.reviewer?.auth_via
            ? ` · ${entry.reviewer.auth_via.replaceAll("_", " ")}`
            : ""}
        </p>
      </div>

      {entry.local_insights ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="font-medium text-cream">Lived-in notes</p>
          {(
            [
              ["Problems", entry.local_insights.problems_faced],
              ["Hurdles", entry.local_insights.hurdles],
              ["Politics", entry.local_insights.local_politics],
              ["Legal", entry.local_insights.legal_issues],
            ] as const
          ).map(([label, value]) =>
            value?.trim() ? (
              <p key={label} className="text-sm leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-200">{label}: </span>
                {value}
              </p>
            ) : null
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No lived-in notes attached.</p>
      )}

      {log ? (
        <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {(
            [
              ["Identity", log.pillar_1_passed],
              ["Structure", log.pillar_2_passed],
              ["Internal DB", log.pillar_3_passed],
              ["External", log.pillar_4_passed],
            ] as const
          ).map(([label, passed]) => (
            <li
              key={label}
              className={cn(
                "rounded-lg px-2 py-2 text-center",
                passed ? "bg-teal/15 text-teal-200" : "bg-brass/15 text-brass"
              )}
            >
              {label}
              <span className="mt-0.5 block font-semibold">
                {passed ? "Pass" : "Flag"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {(entry.tags?.length || entry.photos?.length) ? (
        <div className="space-y-2">
          {entry.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-cream"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {entry.photos?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {entry.photos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-20 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MarketList({
  listings,
  note,
}: {
  listings: ExternalListing[];
  note: string;
}) {
  if (listings.length === 0) {
    return <p className="text-sm text-slate-500">{note}</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Cached 24h · NoBroker, 99acres, MyGate, MagicBricks, Anacity
      </p>
      {listings.map((listing) => (
        <article
          key={listing.id}
          className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-3"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            Listing via {listing.platform}
          </span>
          {listing.url ? (
            <a
              href={listing.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-medium text-cream hover:text-brass"
            >
              {listing.title}
            </a>
          ) : (
            <p className="mt-1 font-medium text-cream">{listing.title}</p>
          )}
          <p className="text-sm text-slate-400">
            {listing.monthly_rent ? formatINR(listing.monthly_rent) : "—"} ·{" "}
            {listing.building_name}
          </p>
        </article>
      ))}
    </div>
  );
}
