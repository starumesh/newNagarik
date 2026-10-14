"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  CalendarRange,
  Landmark,
  Loader2,
  Newspaper,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  EXPLORE_CITIES,
  EXPLORE_TOPICS,
  staticMacroPack,
  type DemandArea,
  type ExploreTopic,
  type MacroExplorePack,
} from "@/lib/data/macro-explore";
import { formatINR, formatPct } from "@/lib/format";
import type { CityName } from "@/lib/data/cities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type MacroPack = MacroExplorePack & {
  llm_configured?: boolean;
  warning?: string;
};

const TOPIC_ICONS: Record<ExploreTopic, React.ReactNode> = {
  overview: <TrendingUp className="size-3.5" />,
  demand: <TrendingUp className="size-3.5" />,
  "it-gcc": <Landmark className="size-3.5" />,
  projects: <Building2 className="size-3.5" />,
  news: <Newspaper className="size-3.5" />,
  income: <Wallet className="size-3.5" />,
};

function tagClass(tag: string) {
  if (tag === "Trending" || tag === "Rising" || tag === "High") {
    return "bg-accent text-teal-800";
  }
  if (tag === "Premium" || tag === "₹50L+") return "bg-navy/10 text-navy";
  if (tag === "Emerging") return "bg-amber-50 text-amber-900";
  return "bg-secondary text-muted-foreground";
}

export function ExplorerDashboard({ homeCity }: { homeCity: string | null }) {
  const initialCity =
    (EXPLORE_CITIES.find((item) => item === homeCity) as CityName | undefined) ??
    "Bengaluru";
  const [city, setCity] = useState<CityName>(initialCity);
  const [topic, setTopic] = useState<ExploreTopic>("overview");
  const [pack, setPack] = useState<MacroPack>(() => staticMacroPack(initialCity));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef(0);

  async function loadCity(nextCity: CityName, refresh = false) {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    // Show the correct city's curated baseline immediately so UI never keeps the previous city.
    startTransition(() => setPack(staticMacroPack(nextCity)));
    try {
      const response = await fetch(
        `/api/macro-explore?city=${encodeURIComponent(nextCity)}${
          refresh ? "&refresh=1" : ""
        }`
      );
      const json = (await response.json()) as MacroPack & { error?: string };
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load trends.");
      }
      if (json.city && json.city !== nextCity) {
        throw new Error(`Received ${json.city} data while loading ${nextCity}.`);
      }
      startTransition(() => setPack(json));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Could not load trends.");
      startTransition(() => setPack(staticMacroPack(nextCity)));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadCity(city);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when city changes
  }, [city]);

  const demandChart = useMemo(
    () =>
      pack.demand.map((row) => ({
        name:
          row.locality.length > 12
            ? `${row.locality.slice(0, 11)}…`
            : row.locality,
        full: row.locality,
        demand: row.demand_index,
        rent: row.avg_rent,
      })),
    [pack.demand]
  );
  const topicMeta = EXPLORE_TOPICS.find((row) => row.id === topic)!;
  const busy = loading || pending;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Explorable trends
          </p>
          <h1 className="mt-2 font-serif text-4xl text-navy">
            Read the city before the building.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Demand belts, IT/GCC catchments, project timelines, income pockets,
            and market moves — refreshed with live model insights when
            configured. Society-level rents unlock after verification.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={() => void loadCity(city, true)}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Refresh city
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {pack.source === "llm"
              ? `Live model · ${pack.model ?? "llm"}`
              : pack.llm_configured === false
                ? "Curated baseline · add OPENROUTER_API_KEY for live"
                : "Curated baseline"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXPLORE_CITIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCity(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              city === item
                ? "border-teal bg-accent text-navy"
                : "border-border text-muted-foreground hover:border-teal/40"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {EXPLORE_TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTopic(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
              topic === item.id
                ? "border-navy bg-navy text-cream"
                : "border-border text-navy/70 hover:border-navy/30"
            )}
          >
            {TOPIC_ICONS[item.id]}
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">{topicMeta.blurb}</p>
        {busy ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-teal-700">
            <Loader2 className="size-3 animate-spin" />
            Updating {city}…
          </span>
        ) : null}
        {error ? (
          <span className="text-xs text-amber-800">{error}</span>
        ) : null}
        {pack.warning ? (
          <span className="text-xs text-amber-800">{pack.warning}</span>
        ) : null}
      </div>

      {topic === "overview" ? (
        <div className="space-y-4">
          <section className="ledger-card overflow-hidden">
            <div className="border-b border-border/70 bg-gradient-to-br from-accent/80 via-card to-secondary/60 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                {city} pulse
              </p>
              <h2 className="mt-2 max-w-3xl font-serif text-2xl text-navy sm:text-3xl">
                {pack.pulse.headline}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <PulseStat label="Vacancy signal" value={pack.pulse.vacancy_hint} />
                <PulseStat label="Absorption" value={pack.pulse.absorption} />
                <PulseStat label="Hot corridor" value={pack.pulse.hot_corridor} />
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
            <section className="ledger-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-navy">
                  Rent inflation (12 months)
                </h2>
                <span className="text-xs text-muted-foreground">{city}</span>
              </div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pack.inflation}>
                    <defs>
                      <linearGradient id="inflFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D9488" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e8e2d6" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="#5b6573" fontSize={12} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [`${value}% MoM`, "Change"]}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#d9d1c3",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="change"
                      stroke="#0D9488"
                      strokeWidth={2.5}
                      fill="url(#inflFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="ledger-card p-5">
              <h2 className="font-serif text-2xl text-navy">Top searched in {city}</h2>
              <ol className="mt-4 space-y-3 text-sm">
                {[...pack.demand]
                  .sort((a, b) => b.demand_index - a.demand_index)
                  .slice(0, 5)
                  .map((row, index) => (
                    <li
                      key={row.locality}
                      className="flex justify-between gap-3 border-b border-border/70 pb-2"
                    >
                      <span>
                        {index + 1}. {row.locality}
                        <span className="block text-xs text-muted-foreground">
                          {city}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        demand {row.demand_index}
                      </span>
                    </li>
                  ))}
              </ol>
            </section>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pack.demand.slice(0, 6).map((row) => (
              <DemandCard key={row.locality} row={row} />
            ))}
          </div>

          <section className="ledger-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarRange className="size-4 text-teal-700" />
              <h2 className="font-serif text-2xl text-navy">Near-term timeline</h2>
            </div>
            <div className="space-y-3">
              {pack.timeline.slice(0, 4).map((event) => (
                <div
                  key={`${event.quarter}-${event.title}`}
                  className="grid gap-1 border-l-2 border-teal/40 pl-4 sm:grid-cols-[7rem_1fr]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {event.quarter}
                  </p>
                  <div>
                    <p className="text-sm font-medium text-navy">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {topic === "demand" ? (
        <div className="space-y-4">
          <section className="ledger-card p-5">
            <h2 className="font-serif text-2xl text-navy">Demand index by locality</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Relative search + move-in heat — not a building average.
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandChart} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid stroke="#e8e2d6" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="#5b6573"
                    fontSize={11}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#5b6573" fontSize={12} />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      value,
                      item?.payload?.full ?? "Demand",
                    ]}
                    contentStyle={{ borderRadius: 12, borderColor: "#d9d1c3" }}
                  />
                  <Bar dataKey="demand" fill="#0D9488" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pack.demand.map((row) => (
              <DemandCard key={row.locality} row={row} />
            ))}
          </div>
        </div>
      ) : null}

      {topic === "it-gcc" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Map jobs first, then housing catchments — GCCs and IT parks still
            explain most mid-premium rent gravity.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {pack.corridors.map((row) => (
              <article key={row.name} className="ledger-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                      {row.kind}
                    </p>
                    <h3 className="mt-1 font-serif text-xl text-navy">{row.name}</h3>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {row.rent_band}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{row.note}</p>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Employers / anchors
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.employers.map((name) => (
                      <span
                        key={name}
                        className="rounded-md border border-border px-2 py-1 text-xs text-navy"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Renter catchments
                  </p>
                  <p className="mt-1 text-sm text-navy">{row.catchments.join(" · ")}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {topic === "projects" ? (
        <div className="space-y-4">
          <section className="ledger-card p-5">
            <h2 className="font-serif text-2xl text-navy">Delivery timeline</h2>
            <div className="mt-4 space-y-3">
              {pack.timeline.map((event) => (
                <div
                  key={`${event.quarter}-${event.title}`}
                  className="grid gap-1 border-l-2 border-teal/40 pl-4 sm:grid-cols-[7.5rem_1fr]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {event.quarter}
                  </p>
                  <div>
                    <p className="text-sm font-medium text-navy">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            {pack.projects.map((project) => (
              <article key={project.name} className="ledger-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      tagClass(project.status)
                    )}
                  >
                    {project.status}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {project.type}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-xl text-navy">{project.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.area} · {project.timeline} · {project.units_or_sqft}
                </p>
                <p className="mt-3 text-sm text-navy/80">{project.impact}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {topic === "news" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {pack.news.map((item) => (
            <article key={item.title} className="ledger-card p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-accent px-2.5 py-1 text-teal-800">
                  {item.category}
                </span>
                <span className="text-muted-foreground">
                  {item.date} · {item.source}
                </span>
                <span className="text-muted-foreground">{item.city}</span>
              </div>
              <h3 className="mt-3 font-serif text-xl leading-snug text-navy">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {topic === "income" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            High-income and lifestyle belts help frame where rents hold —
            still locality bands, not society ledgers.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {pack.income.map((row) => (
              <article key={row.locality} className="ledger-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-serif text-xl text-navy">{row.locality}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      tagClass(row.interest)
                    )}
                  >
                    {row.interest} interest
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Household income signal · {row.income_band}
                </p>
                <p className="mt-3 text-sm text-navy/80">{row.vibe}</p>
                <p className="mt-2 text-sm text-teal-800">{row.rent_signal}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PulseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/80 px-3 py-3 ring-1 ring-border/60">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm leading-snug text-navy">{value}</p>
    </div>
  );
}

function DemandCard({ row }: { row: DemandArea }) {
  return (
    <article className="ledger-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-xl text-navy">{row.locality}</h3>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px]", tagClass(row.tag))}>
          {row.tag}
        </span>
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
        Locality band
      </p>
      <p className="font-serif text-2xl">{formatINR(row.avg_rent)}</p>
      <p className="mt-1 text-sm text-teal-700">
        YoY {formatPct(row.yoy_change)} · demand {row.demand_index}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.why}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-teal"
          style={{ width: `${Math.min(100, row.demand_index)}%` }}
        />
      </div>
    </article>
  );
}
