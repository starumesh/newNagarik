import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickInsights } from "@/lib/local-insights";
import { reviewerFromAuthUser } from "@/lib/phone";
import { readAdminMeta } from "@/lib/admin-meta";
import type { LocalInsights, ReviewerIdentity, VerificationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function rank(status: string) {
  if (status === "under_review") return 0;
  if (status === "auto_approved") return 1;
  return 2;
}

async function reviewersFor(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[]
) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, ReviewerIdentity>();
  await Promise.all(
    unique.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      map.set(id, reviewerFromAuthUser(data.user ?? null));
    })
  );
  return map;
}

export async function GET() {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rent_entries")
    .select("*, locations(*), verification_logs(*)")
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: "Could not load queue." }, { status: 500 });
  }

  const reviewers = await reviewersFor(
    admin,
    (data ?? []).map((entry) => entry.user_id as string)
  );

  const entries = [...(data ?? [])]
    .map((entry) => {
      const logs = (
        (entry.verification_logs as Array<{
          details?: Record<string, unknown>;
          created_at?: string;
        }> | null) ?? []
      )
        .slice()
        .sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime;
        });
      const fromLog = logs
        .map((log) => log.details?.local_insights as LocalInsights | undefined)
        .find((value) => value && typeof value === "object");
      const insights = pickInsights(
          (entry.local_insights as LocalInsights | null) ?? null,
          fromLog ?? null
        );
      const meta = readAdminMeta(insights);
      return {
        ...entry,
        tags: Array.isArray(entry.tags) && entry.tags.length ? entry.tags : meta.tags ?? [],
        photos:
          Array.isArray(entry.photos) && entry.photos.length
            ? entry.photos
            : meta.photos ?? [],
        is_hidden: Boolean(entry.is_hidden) || Boolean(meta.hidden),
        admin_score:
          typeof entry.admin_score === "number" ? entry.admin_score : meta.score ?? null,
        reviewer: reviewers.get(entry.user_id as string) ?? {
          phone: null,
          email: null,
          auth_via: null,
        },
        local_insights: insights,
      };
    })
    .sort((a, b) => {
      const hiddenRank = Number(Boolean(a.is_hidden)) - Number(Boolean(b.is_hidden));
      if (hiddenRank !== 0) return hiddenRank;
      const byStage = rank(a.verification_status) - rank(b.verification_status);
      if (byStage !== 0) return byStage;
      return (
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
    });

  const counts = entries.reduce(
    (acc, entry) => {
      const status = entry.verification_status as VerificationStatus;
      acc[status] += 1;
      acc.all += 1;
      if (entry.is_hidden) acc.hidden += 1;
      return acc;
    },
    { all: 0, under_review: 0, auto_approved: 0, rejected: 0, hidden: 0 }
  );

  return NextResponse.json({ entries, counts });
}
