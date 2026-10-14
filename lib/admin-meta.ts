import type { LocalInsights } from "@/lib/types";

export type AdminReviewMeta = {
  hidden?: boolean;
  tags?: string[];
  photos?: string[];
  score?: number | null;
};

type InsightsWithAdmin = LocalInsights & { _admin?: AdminReviewMeta };

export function readAdminMeta(insights?: LocalInsights | null): AdminReviewMeta {
  const raw = (insights as InsightsWithAdmin | null | undefined)?._admin;
  if (!raw || typeof raw !== "object") return {};
  return {
    hidden: Boolean(raw.hidden),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    photos: Array.isArray(raw.photos) ? raw.photos.map(String) : [],
    score: typeof raw.score === "number" ? raw.score : null,
  };
}

export function mergeAdminMeta(
  insights: LocalInsights | null | undefined,
  patch: AdminReviewMeta
): InsightsWithAdmin {
  const current = readAdminMeta(insights);
  return {
    ...(insights ?? {}),
    _admin: {
      hidden: patch.hidden ?? current.hidden ?? false,
      tags: patch.tags ?? current.tags ?? [],
      photos: patch.photos ?? current.photos ?? [],
      score: patch.score === undefined ? current.score ?? null : patch.score,
    },
  };
}

export function stripAdminMeta<T extends { local_insights?: LocalInsights | null }>(
  row: T
): T {
  if (!row.local_insights) return row;
  const { _admin: _ignored, ...rest } = row.local_insights as InsightsWithAdmin;
  return { ...row, local_insights: rest };
}

