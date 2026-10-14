import { z } from "zod";
import { chatJson, extractJsonObject, isLlmConfigured } from "@/lib/llm";
import {
  EXPLORE_CITIES,
  isExploreCity,
  staticMacroPack,
  type MacroExplorePack,
} from "@/lib/data/macro-explore";
import { CITY_AREAS, type CityName } from "@/lib/data/cities";
import { cacheGet, cacheSet } from "@/lib/redis";

export type { MacroExplorePack };
export { isExploreCity, staticMacroPack };

const CACHE_VERSION = "v3";
const CACHE_TTL_SECONDS = 60 * 60 * 12;
const memoryCache = new Map<string, { expires: number; pack: MacroExplorePack }>();

function cityAnchors(city: CityName): string[] {
  return (CITY_AREAS[city] ?? []).slice(0, 12);
}

function foreignCityHints(city: CityName): string[] {
  const blocked: string[] = [];
  for (const other of EXPLORE_CITIES) {
    if (other === city) continue;
    blocked.push(...(CITY_AREAS[other] ?? []).slice(0, 8));
  }
  return blocked;
}

function countLocalityHits(blob: string, localities: string[]) {
  const lower = blob.toLowerCase();
  return localities.filter((name) => lower.includes(name.toLowerCase())).length;
}

function packContentBlob(pack: MacroExplorePack): string {
  return [
    pack.pulse.headline,
    pack.pulse.hot_corridor,
    pack.pulse.absorption,
    ...pack.demand.map((row) => row.locality),
    ...pack.corridors.flatMap((row) => [row.name, ...row.catchments, ...row.employers]),
    ...pack.projects.map((row) => `${row.name} ${row.area}`),
    ...pack.income.map((row) => row.locality),
    ...pack.news.map((row) => `${row.title} ${row.summary}`),
    ...pack.timeline.map((row) => `${row.title} ${row.detail}`),
  ].join(" | ");
}

/** Reject LLM packs that clearly describe another Indian city. */
function assertPackMatchesCity(city: CityName, pack: MacroExplorePack) {
  const blob = packContentBlob(pack);
  const ownHits = countLocalityHits(blob, cityAnchors(city));

  let bestOtherHits = 0;
  let bestOtherCity: CityName | null = null;
  for (const other of EXPLORE_CITIES) {
    if (other === city) continue;
    const hits = countLocalityHits(blob, cityAnchors(other));
    if (hits > bestOtherHits) {
      bestOtherHits = hits;
      bestOtherCity = other;
    }
  }

  if (bestOtherHits >= 2 && bestOtherHits > ownHits) {
    throw new Error(
      `LLM returned ${bestOtherCity} localities for ${city} — using curated ${city} baseline.`
    );
  }
  if (ownHits === 0 && bestOtherHits >= 1) {
    throw new Error(
      `LLM pack missing ${city} localities — using curated ${city} baseline.`
    );
  }
}

const num = () => z.coerce.number().finite();
const int = () =>
  z.coerce.number().finite().transform((value) => Math.round(value));
const text = (min: number, max: number) =>
  z.coerce.string().trim().pipe(z.string().min(min).max(max));

function mapEnum<T extends string>(
  value: unknown,
  table: Record<string, T>,
  fallback?: T
): T | unknown {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase();
  return table[key] ?? fallback ?? value;
}

const demandSchema = z.object({
  locality: text(2, 120),
  avg_rent: int().pipe(z.number().positive().max(500000)),
  yoy_change: num().pipe(z.number().min(-30).max(50)),
  demand_index: int().pipe(z.number().min(1).max(100)),
  tag: z.preprocess((value) => {
    const mapped = mapEnum(value, {
      trending: "Trending",
      hot: "Trending",
      stable: "Stable",
      emerging: "Emerging",
      new: "Emerging",
      premium: "Premium",
      luxury: "Premium",
    });
    if (
      mapped === "Trending" ||
      mapped === "Stable" ||
      mapped === "Emerging" ||
      mapped === "Premium"
    ) {
      return mapped;
    }
    return "Stable";
  }, z.enum(["Trending", "Stable", "Emerging", "Premium"])),
  why: text(4, 400),
});

function asStringArray(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/[,;|/·]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value;
}

const corridorSchema = z.object({
  name: text(2, 160),
  kind: z.preprocess(
    (value) =>
      mapEnum(value, {
        "it park": "IT park",
        it: "IT park",
        "gcc hub": "GCC hub",
        gcc: "GCC hub",
        sez: "SEZ",
        fintech: "Fintech",
        mixed: "Mixed",
      }, "IT park"),
    z.enum(["IT park", "GCC hub", "SEZ", "Fintech", "Mixed"])
  ),
  employers: z.preprocess(asStringArray, z.array(text(1, 100)).min(1).max(10)),
  catchments: z.preprocess(asStringArray, z.array(text(1, 100)).min(1).max(10)),
  rent_band: text(2, 120),
  note: text(4, 400),
});

const projectSchema = z.object({
  name: text(2, 180),
  area: text(2, 120),
  type: z.preprocess((value) => {
    const mapped = mapEnum(value, {
      residential: "Residential",
      housing: "Residential",
      apartment: "Residential",
      office: "Office",
      commercial: "Office",
      "mixed-use": "Mixed-use",
      "mixed use": "Mixed-use",
      mixed: "Mixed-use",
      township: "Mixed-use",
      infra: "Infra",
      infrastructure: "Infra",
      transit: "Infra",
      metro: "Infra",
      road: "Infra",
      airport: "Infra",
    });
    if (
      mapped === "Residential" ||
      mapped === "Office" ||
      mapped === "Mixed-use" ||
      mapped === "Infra"
    ) {
      return mapped;
    }
    const raw = String(value ?? "").toLowerCase();
    if (/office|commercial|sez/.test(raw)) return "Office";
    if (/mix|township|retail/.test(raw)) return "Mixed-use";
    if (/infra|metro|road|airport|express|rail|bridge/.test(raw)) return "Infra";
    return "Residential";
  }, z.enum(["Residential", "Office", "Mixed-use", "Infra"])),
  status: z.preprocess((value) => {
    const mapped = mapEnum(value, {
      launched: "Launched",
      live: "Launched",
      completed: "Launched",
      "under construction": "Under construction",
      construction: "Under construction",
      ongoing: "Under construction",
      uc: "Under construction",
      announced: "Announced",
      proposed: "Announced",
      planned: "Announced",
      "near delivery": "Near delivery",
      "ready to move": "Near delivery",
      possession: "Near delivery",
    });
    if (
      mapped === "Launched" ||
      mapped === "Under construction" ||
      mapped === "Announced" ||
      mapped === "Near delivery"
    ) {
      return mapped;
    }
    const raw = String(value ?? "").toLowerCase();
    if (/launch|complete|ready|handover/.test(raw)) return "Launched";
    if (/construct|ongoing|progress/.test(raw)) return "Under construction";
    if (/near|possess|delivery|rera/.test(raw)) return "Near delivery";
    return "Announced";
  }, z.enum(["Launched", "Under construction", "Announced", "Near delivery"])),
  timeline: text(2, 120),
  units_or_sqft: text(2, 120),
  impact: text(4, 400),
});

const newsSchema = z.object({
  title: text(6, 220),
  summary: text(12, 600),
  category: z.preprocess((value) => {
    const mapped = mapEnum(value, {
      policy: "Policy",
      regulation: "Policy",
      rera: "Policy",
      infra: "Infra",
      infrastructure: "Infra",
      transit: "Infra",
      corporate: "Corporate",
      company: "Corporate",
      hiring: "Corporate",
      gcc: "Corporate",
      market: "Market",
      rents: "Market",
      demand: "Market",
      lifestyle: "Lifestyle",
      residential: "Lifestyle",
    });
    if (
      mapped === "Policy" ||
      mapped === "Infra" ||
      mapped === "Corporate" ||
      mapped === "Market" ||
      mapped === "Lifestyle"
    ) {
      return mapped;
    }
    const raw = String(value ?? "").toLowerCase();
    if (/policy|regulat|rera|tax/.test(raw)) return "Policy";
    if (/infra|metro|road|airport|express/.test(raw)) return "Infra";
    if (/corporate|compan|hiring|gcc|office/.test(raw)) return "Corporate";
    if (/life|family|amenit/.test(raw)) return "Lifestyle";
    return "Market";
  }, z.enum(["Policy", "Infra", "Corporate", "Market", "Lifestyle"])),
  date: text(3, 60),
  source: text(2, 80),
  city: z.coerce.string().trim().max(40).optional(),
});

const incomeSchema = z.object({
  locality: text(2, 120),
  income_band: z.preprocess((value) => {
    if (typeof value !== "string") return "Mixed";
    const compact = value.replace(/\s+/g, "");
    if (/15.30|15–30|15-30/i.test(compact)) return "₹15–30L";
    if (/30.50|30–50|30-50/i.test(compact)) return "₹30–50L";
    if (/50L?\+|50\+/i.test(compact) || /₹?50/i.test(compact)) return "₹50L+";
    if (/mixed|mid|varied/i.test(compact)) return "Mixed";
    return "Mixed";
  }, z.enum(["₹15–30L", "₹30–50L", "₹50L+", "Mixed"])),
  vibe: text(3, 200),
  rent_signal: text(3, 200),
  interest: z.preprocess((value) => {
    const mapped = mapEnum(value, {
      high: "High",
      rising: "Rising",
      up: "Rising",
      steady: "Steady",
      stable: "Steady",
    });
    if (mapped === "High" || mapped === "Rising" || mapped === "Steady") {
      return mapped;
    }
    return "Steady";
  }, z.enum(["High", "Rising", "Steady"])),
});

const timelineSchema = z.object({
  quarter: text(2, 60),
  title: text(3, 180),
  detail: text(4, 400),
});

const packSchema = z.object({
  pulse: z.object({
    headline: text(6, 240),
    vacancy_hint: text(3, 200),
    absorption: text(3, 220),
    hot_corridor: text(2, 120),
  }),
  demand: z.array(demandSchema).min(3).max(12),
  corridors: z.array(corridorSchema).min(1).max(8),
  projects: z.array(projectSchema).min(2).max(10),
  news: z.array(newsSchema).min(3).max(12),
  income: z.array(incomeSchema).min(2).max(10),
  timeline: z.array(timelineSchema).min(2).max(10),
  inflation: z
    .array(
      z.object({
        month: text(2, 16),
        change: num().pipe(z.number().min(-8).max(12)),
      })
    )
    .min(4)
    .max(12),
});

function normalizePack(
  city: CityName,
  raw: z.infer<typeof packSchema>,
  meta: { source: "llm" | "static"; model?: string }
): MacroExplorePack {
  return {
    city,
    pulse: { city, ...raw.pulse },
    demand: raw.demand.map((row) => ({ ...row, city })),
    corridors: raw.corridors.map((row) => ({ ...row, city })),
    projects: raw.projects.map((row) => ({ ...row, city })),
    news: raw.news.map((row) => ({
      ...row,
      city: row.city === "India" ? "India" : city,
    })),
    income: raw.income.map((row) => ({ ...row, city })),
    timeline: raw.timeline.map((row) => ({ ...row, city })),
    inflation: raw.inflation,
    source: meta.source,
    model: meta.model,
    generated_at: new Date().toISOString(),
  };
}

async function generateWithLlm(city: CityName): Promise<MacroExplorePack> {
  const anchors = cityAnchors(city);
  const blocked = foreignCityHints(city).slice(0, 24);

  const { text, model } = await chatJson({
    temperature: 0.2,
    timeoutMs: 90_000,
    messages: [
      {
        role: "system",
        content: `You are a India residential rental market analyst for NewNagarik.
Return ONLY valid JSON for exploratory MACRO trends (locality bands, not society-level facts).
Target city is EXACTLY "${city}", India — every locality, corridor, project area, and headline must belong to ${city}.
Do not mention other Indian metros' micro-markets.
Use plausible mid-2026 India context: IT parks, GCCs, metros, expressways, launches.
Do not invent exact live asking prices as facts — use indicative averages.
Never output placeholders like [ADDRESS], [CITY], [LOCATION], or TBD.`,
      },
      {
        role: "user",
        content: `Build an explorable macro trends pack ONLY for ${city}, India.

Must-use ${city} localities (choose demand/income/catchments from this list):
${anchors.map((name) => `- ${name}`).join("\n")}

Do NOT use localities from other cities, including:
${blocked.map((name) => `- ${name}`).join("\n")}

JSON shape:
{
  "pulse": { "headline", "vacancy_hint", "absorption", "hot_corridor" },
  "demand": [{ "locality", "avg_rent", "yoy_change", "demand_index", "tag", "why" }],
  "corridors": [{ "name", "kind", "employers", "catchments", "rent_band", "note" }],
  "projects": [{ "name", "area", "type", "status", "timeline", "units_or_sqft", "impact" }],
  "news": [{ "title", "summary", "category", "date", "source", "city" }],
  "income": [{ "locality", "income_band", "vibe", "rent_signal", "interest" }],
  "timeline": [{ "quarter", "title", "detail" }],
  "inflation": [{ "month", "change" }]
}

Constraints:
- pulse.headline must name ${city} (not another metro)
- demand: 6-8 localities from the ${city} list above, demand_index 55-95, tag Trending|Stable|Emerging|Premium
- corridors: 2-4 IT/GCC/SEZ belts inside ${city} with real employer names and ${city} catchments
- projects: 4-6 items in ${city} with timelines
- news: 5-8 short items about ${city} (include 1 India-wide with city "India")
- income: 4-6 belts from the ${city} list; income_band exactly one of "₹15–30L","₹30–50L","₹50L+","Mixed"
- timeline: 4-6 ${city} milestones
- inflation: 12 months Sep..Aug style labels, change MoM % like 0.4 to 1.8
- avg_rent is monthly INR integer for typical 2BHK indicative band`,
      },
    ],
  });

  const raw = extractJsonObject(text);
  const parsed = packSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `LLM JSON failed validation: ${issue?.path.join(".") || "unknown"} ${issue?.message || ""}`.trim()
    );
  }
  const pack = normalizePack(city, parsed.data, { source: "llm", model });
  assertPackMatchesCity(city, pack);
  return pack;
}

export async function getMacroExplorePack(
  city: CityName,
  options?: { refresh?: boolean }
): Promise<MacroExplorePack & { warning?: string }> {
  const cacheKey = `macro-explore:${CACHE_VERSION}:${city}`;

  if (!options?.refresh) {
    const mem = memoryCache.get(cacheKey);
    if (mem && mem.expires > Date.now()) {
      try {
        assertPackMatchesCity(city, mem.pack);
        return mem.pack;
      } catch {
        memoryCache.delete(cacheKey);
      }
    }

    const cached = await cacheGet<MacroExplorePack>(cacheKey);
    if (cached?.city === city && cached.demand?.length) {
      try {
        assertPackMatchesCity(city, cached);
        memoryCache.set(cacheKey, {
          pack: cached,
          expires: Date.now() + CACHE_TTL_SECONDS * 1000,
        });
        return cached;
      } catch {
        // Drop polluted cache entries (e.g. Bengaluru localities under Hyderabad).
      }
    }
  }

  if (!isLlmConfigured()) {
    return staticMacroPack(city);
  }

  try {
    const pack = await generateWithLlm(city);
    memoryCache.set(cacheKey, {
      pack,
      expires: Date.now() + CACHE_TTL_SECONDS * 1000,
    });
    await cacheSet(cacheKey, pack, CACHE_TTL_SECONDS);
    return pack;
  } catch (error) {
    const warning =
      error instanceof Error ? error.message : "Live trends unavailable.";
    return { ...staticMacroPack(city), warning };
  }
}
