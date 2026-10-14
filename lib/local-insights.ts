import type { LocalInsights } from "@/lib/types";

type InsightInput = {
  problems_faced?: string | null;
  hurdles?: string | null;
  local_politics?: string | null;
  legal_issues?: string | null;
  metro_distance_km?: number | null;
  railway_distance_km?: number | null;
  airport_distance_km?: number | null;
  metro_distance?: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalize any stored shape into LocalInsights. */
export function normalizeLocalInsights(raw: unknown): LocalInsights | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  return {
    problems_faced: text(
      obj.problems_faced ?? obj.problems ?? obj.complaints ?? obj.complaint
    ),
    hurdles: text(obj.hurdles ?? obj.hurdle),
    local_politics: text(
      obj.local_politics ?? obj.politics ?? obj.society_dynamics
    ),
    legal_issues: text(obj.legal_issues ?? obj.legal ?? obj.litigation),
    distance_metro_km:
      typeof obj.distance_metro_km === "number"
        ? obj.distance_metro_km
        : typeof obj.metro_distance === "number"
          ? obj.metro_distance
          : null,
    distance_railway_km:
      typeof obj.distance_railway_km === "number"
        ? obj.distance_railway_km
        : null,
    distance_airport_km:
      typeof obj.distance_airport_km === "number"
        ? obj.distance_airport_km
        : null,
  };
}

export function buildLocalInsights(input: InsightInput): LocalInsights {
  const metro = input.metro_distance_km ?? input.metro_distance ?? null;
  return {
    problems_faced: (input.problems_faced ?? "").trim(),
    hurdles: (input.hurdles ?? "").trim(),
    local_politics: (input.local_politics ?? "").trim(),
    legal_issues: (input.legal_issues ?? "").trim(),
    distance_metro_km: metro,
    distance_railway_km: input.railway_distance_km ?? null,
    distance_airport_km: input.airport_distance_km ?? null,
  };
}

export function insightsHaveNotes(insights?: LocalInsights | null): boolean {
  if (!insights) return false;
  return Boolean(
    insights.problems_faced?.trim() ||
      insights.hurdles?.trim() ||
      insights.local_politics?.trim() ||
      insights.legal_issues?.trim()
  );
}

export function pickInsights(
  primary?: LocalInsights | null,
  fallback?: LocalInsights | null
): LocalInsights | null {
  const a = primary ? normalizeLocalInsights(primary) : null;
  const b = fallback ? normalizeLocalInsights(fallback) : null;
  if (insightsHaveNotes(a)) return a;
  if (insightsHaveNotes(b)) return b;
  return a ?? b ?? null;
}
