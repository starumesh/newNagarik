"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MACRO_TRENDS, RENT_INFLATION_SERIES, TOP_SEARCHED_LOCALITIES } from "@/lib/data/trends";
import { formatINR, formatPct } from "@/lib/format";
import { CITIES, type CityName } from "@/lib/data/cities";
import { cn } from "@/lib/utils";

export function ExplorerDashboard({ homeCity }: { homeCity: string | null }) {
  const [city, setCity] = useState<CityName>(
    (CITIES.find((item) => item === homeCity) as CityName | undefined) ?? "Bengaluru"
  );
  const localities = useMemo(
    () => MACRO_TRENDS.filter((row) => row.city === city),
    [city]
  );

  return (
    <div className="space-y-6 pb-24">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Macro trends
        </p>
        <h1 className="mt-2 font-serif text-4xl text-navy">
          The city, not the building.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Explorers see demand heat and inflation. Exact society averages stay
          sealed until you contribute a verified rent.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {CITIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCity(item)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              city === item ? "border-teal bg-accent" : "border-border"
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {localities.map((row) => (
          <article key={row.locality} className="ledger-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-navy">{row.locality}</h2>
              <span
                className="size-8 rounded-full"
                style={{
                  background: `oklch(${0.75 - row.demand_index / 400} 0.12 ${180 - row.demand_index})`,
                }}
                title={`Demand ${row.demand_index}`}
              />
            </div>
            <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
              Locality band (not a building)
            </p>
            <p className="font-serif text-2xl">{formatINR(row.avg_rent)}</p>
            <p className="mt-1 text-sm text-teal-700">
              YoY {formatPct(row.yoy_change)} · demand {row.demand_index}
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="ledger-card p-5">
          <h2 className="font-serif text-2xl text-navy">Rent inflation (12 months)</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RENT_INFLATION_SERIES}>
                <XAxis dataKey="month" stroke="#5b6573" fontSize={12} />
                <YAxis hide />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="change"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="ledger-card p-5">
          <h2 className="font-serif text-2xl text-navy">Top 5 searched</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {TOP_SEARCHED_LOCALITIES.map((row, index) => (
              <li key={row.locality} className="flex justify-between border-b border-border/70 pb-2">
                <span>
                  {index + 1}. {row.locality}
                  <span className="block text-xs text-muted-foreground">{row.city}</span>
                </span>
                <span className="text-muted-foreground">{row.searches.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
