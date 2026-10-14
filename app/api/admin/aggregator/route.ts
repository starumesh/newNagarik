import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { platformSearchLinks } from "@/lib/scrapers/platforms";
import {
  AGGREGATOR_SQL_HINT,
  getAggregatorStore,
  platformCounts,
} from "@/lib/scrapers/store";
import { postedWithinTwoWeeks } from "@/lib/scrapers/web/parse";
import type { AggregatorPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const area = searchParams.get("area") ?? "";
  const platform = (searchParams.get("platform") ?? "all") as
    | AggregatorPlatform
    | "all";

  const store = await getAggregatorStore();
  const [listings, allForCounts, watches, alerts] = await Promise.all([
    store.listListings({
      city: city || undefined,
      area: area || undefined,
      platform,
    }),
    store.listListings({
      city: city || undefined,
      area: area || undefined,
      limit: 400,
    }),
    store.listWatches(),
    store.listAlerts(),
  ]);

  const unreadCount = alerts.filter((alert) => !alert.read_at).length;
  const fresh = listings.filter(
    (post) => post.posted_by === "owner" && postedWithinTwoWeeks(post.posted_at)
  );
  const freshCounts = allForCounts.filter(
    (post) => post.posted_by === "owner" && postedWithinTwoWeeks(post.posted_at)
  );
  const counts = {
    all: freshCounts.length,
    ...platformCounts(freshCounts),
  };

  return NextResponse.json({
    listings: fresh,
    watches,
    alerts,
    unreadCount,
    counts,
    missingSchema: store.missingSchema,
    usingFallback: store.usingFallback,
    sqlHint: store.missingSchema ? AGGREGATOR_SQL_HINT : null,
    searchLinks:
      city && area ? platformSearchLinks({ city, area }) : [],
  });
}
