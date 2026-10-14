"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { OWNER_PLATFORMS } from "@/lib/scrapers/platforms/specs";
import type {
  AggregatorAlert,
  AggregatorPost,
  AreaWatch,
  OwnerPlatform,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type CatalogCity = { name: string; is_enabled: boolean };
type CatalogArea = { city: string; name: string; is_enabled: boolean };

type Dashboard = {
  listings: AggregatorPost[];
  watches: AreaWatch[];
  alerts: AggregatorAlert[];
  unreadCount: number;
  counts: Record<string, number>;
  missingSchema?: boolean;
  usingFallback?: boolean;
  sqlHint?: string | null;
  searchLinks: Array<{ platform: OwnerPlatform; url: string }>;
};

const fieldClass =
  "h-9 rounded-lg border border-white/15 bg-[#070b14] px-2.5 text-sm text-cream";

function postedLabel(value: string | null) {
  if (!value) return "Latest scrape";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest scrape";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isNew(post: AggregatorPost) {
  const stamp = Date.parse(post.first_seen_at);
  if (!Number.isFinite(stamp)) return false;
  return Date.now() - stamp < 24 * 60 * 60 * 1000;
}

export function AggregatorPanel() {
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [areas, setAreas] = useState<CatalogArea[]>([]);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [platform, setPlatform] = useState<"all" | OwnerPlatform>("all");
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [lastScrape, setLastScrape] = useState<string | null>(null);

  const cityAreas = useMemo(
    () => areas.filter((row) => row.city === city && row.is_enabled),
    [areas, city]
  );

  async function loadCatalog() {
    const response = await fetch("/api/admin/catalog");
    const json = await response.json();
    if (!response.ok) return;
    const nextCities = (json.cities ?? []) as CatalogCity[];
    const nextAreas = (json.areas ?? []) as CatalogArea[];
    setCities(nextCities.filter((row) => row.is_enabled));
    setAreas(nextAreas);
    setCity(
      (current) =>
        current ||
        nextCities.find((row) => row.name === "Bengaluru")?.name ||
        nextCities[0]?.name ||
        ""
    );
  }

  async function loadDesk(nextCity = city, nextArea = area, nextPlatform = platform) {
    const params = new URLSearchParams();
    if (nextCity) params.set("city", nextCity);
    if (nextArea) params.set("area", nextArea);
    if (nextPlatform !== "all") params.set("platform", nextPlatform);
    const response = await fetch(`/api/admin/aggregator?${params.toString()}`);
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not load listings.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (!city) return;
    void loadDesk(city, area, platform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, area, platform]);

  async function watchArea() {
    if (!city || !area) {
      toast.error("Pick a city and area to watch.");
      return;
    }
    const response = await fetch("/api/admin/aggregator/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, area }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not watch this area.");
      return;
    }
    toast.success(`Watching ${area}. Refresh to pull the latest owner posts.`);
    await loadDesk();
  }

  async function unwatch(id: string) {
    const response = await fetch(`/api/admin/aggregator/watches?id=${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Could not remove watch.");
      return;
    }
    toast.success("Stopped watching that area.");
    await loadDesk();
  }

  async function refresh(watchId?: string) {
    if (!watchId && (!city || !area)) {
      toast.error("Pick an area, or watch one first.");
      return;
    }
    setRefreshing(true);
    const response = await fetch("/api/admin/aggregator/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(watchId ? { watchId } : { city, area }),
    });
    const json = await response.json();
    setRefreshing(false);
    if (!response.ok) {
      toast.error(json.error ?? "Refresh failed.");
      return;
    }
    toast.success(
      json.source === "web"
        ? `Live web scrape · ${json.fetched} listings from ${json.area} (${json.newCount} new).`
        : json.newCount
          ? `${json.newCount} new owner post${json.newCount === 1 ? "" : "s"} in ${json.area}.`
          : `Checked ${json.area}. No new posts.`
    );
    if (Array.isArray(json.platforms)) {
      setLastScrape(
        json.platforms
          .map(
            (row: { platform: string; source: string; count: number }) =>
              `${row.platform} ${row.count} (${row.source})`
          )
          .join(" · ")
      );
    }
    await loadDesk();
  }

  async function importMcp() {
    if (!city || !area) {
      toast.error("Pick a city and area first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      toast.error("JSON is not valid.");
      return;
    }
    const listings = Array.isArray(parsed)
      ? parsed
      : (parsed as { listings?: unknown[] }).listings;
    if (!Array.isArray(listings) || listings.length === 0) {
      toast.error("Provide a listings array.");
      return;
    }
    const response = await fetch("/api/admin/aggregator/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, area, listings }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Import failed.");
      return;
    }
    toast.success(`Imported ${json.fetched} listings from MCP (${json.newCount} new).`);
    setImportText("");
    setImportOpen(false);
    await loadDesk();
  }

  async function markAlerts(all = false, ids?: string[]) {
    await fetch("/api/admin/aggregator/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { ids }),
    });
    await loadDesk();
  }

  const watchingCurrent = data?.watches.some(
    (watch) =>
      watch.city === city && watch.area === area && watch.is_enabled
  );

  return (
    <div className="space-y-4">
      {data?.sqlHint ? (
        <p className="rounded-xl border border-brass/30 bg-brass/10 px-3 py-2 text-sm text-brass">
          Listings are stored locally until the tables exist. {data.sqlHint}
        </p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#121a2a] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Areas
          </p>
          <div className="space-y-2">
            <select
              className={fieldClass + " w-full"}
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setArea("");
              }}
            >
              {cities.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
            <select
              className={fieldClass + " w-full"}
              value={area}
              onChange={(event) => setArea(event.target.value)}
            >
              <option value="">All areas</option>
              {cityAreas.map((row) => (
                <option key={row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full bg-brass text-navy hover:bg-brass/90"
                disabled={!area || watchingCurrent}
                onClick={() => void watchArea()}
              >
                {watchingCurrent ? "Watching" : "Watch area"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
                disabled={refreshing || !area}
                onClick={() => void refresh()}
              >
                <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
                {refreshing ? "Scraping…" : "Live scrape"}
              </Button>
            </div>
            {lastScrape ? (
              <p className="text-[11px] text-slate-500">{lastScrape}</p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Live scrape keeps owner posts from the last 14 days, with BHK
                and rent read from each listing. MyGate has no public feed.
              </p>
            )}
            <button
              type="button"
              className="text-[11px] text-brass"
              onClick={() => setImportOpen((open) => !open)}
            >
              {importOpen ? "Hide MCP import" : "Import from browser MCP"}
            </button>
            {importOpen ? (
              <div className="space-y-2">
                <textarea
                  className="min-h-28 w-full rounded-lg border border-white/15 bg-[#070b14] p-2 text-xs text-cream"
                  placeholder='[{"platform":"NoBroker","title":"2 BHK in Whitefield","url":"https://www.nobroker.in/...","monthly_rent":32000,"bhk":2}]'
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                />
                <Button
                  size="sm"
                  className="rounded-full bg-brass text-navy hover:bg-brass/90"
                  disabled={!area || !importText.trim()}
                  onClick={() => void importMcp()}
                >
                  Import listings
                </Button>
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Watched
            </p>
            <div className="max-h-[22rem] space-y-1.5 overflow-y-auto">
              {(data?.watches ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Watch an area to scrape the latest owner posts on a schedule.
                </p>
              ) : (
                data?.watches.map((watch) => (
                  <div
                    key={watch.id}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      watch.city === city && watch.area === area
                        ? "border-brass/60 bg-brass/10"
                        : "border-white/10"
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setCity(watch.city);
                        setArea(watch.area);
                      }}
                    >
                      <span className="block text-sm text-cream">{watch.area}</span>
                      <span className="text-xs text-slate-500">{watch.city}</span>
                    </button>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
                        disabled={refreshing}
                        onClick={() => void refresh(watch.id)}
                      >
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-slate-400"
                        onClick={() => void unwatch(watch.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-[#121a2a]">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-serif text-3xl text-cream">
                {area || city || "Latest owner posts"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Sorted newest first · NoBroker, MagicBricks, MyGate
              </p>
            </div>
            <div className="relative">
              <Button
                variant="outline"
                className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
                onClick={() => setShowAlerts((open) => !open)}
              >
                <Bell className="size-3.5" />
                Alerts
                {(data?.unreadCount ?? 0) > 0 ? (
                  <span className="ml-1 rounded-full bg-brass px-1.5 text-[10px] font-semibold text-navy">
                    {data?.unreadCount}
                  </span>
                ) : null}
              </Button>
              {showAlerts ? (
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-white/10 bg-[#0b1220] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      New posts
                    </p>
                    {(data?.unreadCount ?? 0) > 0 ? (
                      <button
                        type="button"
                        className="text-xs text-brass"
                        onClick={() => void markAlerts(true)}
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {(data?.alerts ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">No alerts yet.</p>
                    ) : (
                      data?.alerts.map((alert) => (
                        <a
                          key={alert.id}
                          href={alert.url ?? "#"}
                          target={alert.url ? "_blank" : undefined}
                          rel="noreferrer"
                          onClick={() => {
                            if (!alert.read_at) void markAlerts(false, [alert.id]);
                          }}
                          className={cn(
                            "block rounded-lg px-2 py-2 text-sm",
                            alert.read_at
                              ? "text-slate-500"
                              : "bg-white/5 text-cream"
                          )}
                        >
                          <span className="block font-medium">{alert.title}</span>
                          <span className="text-xs text-slate-500">
                            {alert.platform} · {alert.area}
                          </span>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          <div className="flex flex-wrap gap-1.5 px-5 pt-4">
            {(["all", ...OWNER_PLATFORMS] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPlatform(item)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold",
                  platform === item
                    ? "bg-brass text-navy"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-cream"
                )}
              >
                {item === "all" ? "All" : item}
                <span className="ml-1 tabular-nums opacity-80">
                  {item === "all"
                    ? data?.counts.all ?? 0
                    : data?.counts[item] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {data?.searchLinks.length ? (
            <div className="flex flex-wrap gap-2 px-5 pt-3">
              {data.searchLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-slate-300 hover:border-brass/50 hover:text-cream"
                >
                  Open {link.platform}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          ) : null}

          <div className="space-y-2 p-5">
            {loading ? (
              <p className="text-sm text-slate-500">Loading listings…</p>
            ) : (data?.listings.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                {area
                  ? "No owner posts from the last 14 days in this area."
                  : "Pick an area to filter, or watch one to start collecting posts."}
              </p>
            ) : (
              data?.listings.map((listing) => (
                <a
                  key={listing.id}
                  href={listing.url ?? "#"}
                  target={listing.url ? "_blank" : undefined}
                  rel="noreferrer"
                  className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-brass/40"
                >
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-medium text-cream">
                      {listing.title}
                      {listing.url ? (
                        <ExternalLink className="ml-1.5 inline size-3.5 text-slate-500" />
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {isNew(listing) ? (
                        <span className="rounded-full bg-brass/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brass">
                          New
                        </span>
                      ) : null}
                      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                        {listing.platform}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-slate-400">
                    {listing.monthly_rent ? formatINR(listing.monthly_rent) : "Rent on listing"}
                    {listing.bhk ? ` · ${listing.bhk} BHK` : ""}
                    {listing.building_name ? ` · ${listing.building_name}` : ""}
                    {` · ${listing.area}`}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {listing.posted_by === "owner" ? "Owner" : listing.posted_by}
                    {" · posted "}
                    {postedLabel(listing.posted_at)}
                  </span>
                </a>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
