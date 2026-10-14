import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { scrapeArea, scrapeAreaWatch } from "@/lib/scrapers/area-feed";
import { isOwnerPlatform, OWNER_PLATFORMS } from "@/lib/scrapers/platforms";
import { getAggregatorStore } from "@/lib/scrapers/store";
import { clientIp, limitByIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await limitByIp(clientIp(request), "agg-refresh", 20);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Refresh limit reached. Try again later." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    watchId?: string;
    city?: string;
    area?: string;
    platforms?: string[];
  };

  const store = await getAggregatorStore();

  if (body.watchId) {
    const watch = (await store.listWatches()).find((row) => row.id === body.watchId);
    if (!watch) {
      return NextResponse.json({ error: "Watch not found." }, { status: 404 });
    }
    const result = await scrapeAreaWatch(watch, store);
    return NextResponse.json(result);
  }

  const city = body.city?.trim();
  const area = body.area?.trim();
  if (!city || !area) {
    return NextResponse.json(
      { error: "Pick an area to refresh." },
      { status: 400 }
    );
  }

  const platforms = (body.platforms ?? []).filter(isOwnerPlatform);
  const result = await scrapeArea(
    { city, area },
    platforms.length > 0 ? platforms : OWNER_PLATFORMS
  );
  return NextResponse.json(result);
}
