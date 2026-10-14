import { sendNewListingsDigest } from "@/lib/email";
import { env } from "@/lib/env";
import {
  fetchAreaListings,
  OWNER_PLATFORMS,
  type AreaQuery,
} from "@/lib/scrapers/platforms";
import { getAggregatorStore } from "@/lib/scrapers/store";
import type { AreaWatch, OwnerPlatform } from "@/lib/types";

export async function scrapeAreaWatch(
  watch: AreaWatch,
  store?: Awaited<ReturnType<typeof getAggregatorStore>>
) {
  const client = store ?? (await getAggregatorStore());
  const platforms =
    watch.platforms.length > 0 ? watch.platforms : OWNER_PLATFORMS;
  const { posts, source, platforms: platformResults } = await fetchAreaListings(
    { city: watch.city, area: watch.area },
    platforms
  );
  const scrapedPlatforms = platformResults
    .filter((row) => row.source === "web" || row.source === "live")
    .map((row) => row.platform);
  if (scrapedPlatforms.length > 0) {
    await client.pruneAreaListings(watch.city, watch.area, scrapedPlatforms);
  }
  const hadScraped = Boolean(watch.last_scraped_at);
  const { inserted } = await client.upsertListings(posts);
  await client.touchWatch(watch.id);

  if (hadScraped && inserted.length > 0) {
    await client.addAlerts(
      inserted.map((post) => ({
        watch_id: watch.id,
        listing_id: post.id,
        title: post.title,
        city: post.city,
        area: post.area,
        platform: post.platform,
        url: post.url,
      }))
    );
    const to = watch.notify_email || env.adminEmail;
    if (to) {
      await sendNewListingsDigest({
        to,
        city: watch.city,
        area: watch.area,
        count: inserted.length,
        listings: inserted,
      });
    }
  }

  return {
    watchId: watch.id,
    city: watch.city,
    area: watch.area,
    source,
    fetched: posts.length,
    newCount: inserted.length,
    platforms: platformResults,
  };
}

export async function scrapeArea(
  query: AreaQuery,
  platforms: OwnerPlatform[] = OWNER_PLATFORMS
) {
  const store = await getAggregatorStore();
  const watch = await store.saveWatch({
    city: query.city,
    area: query.area,
    platforms,
  });
  return scrapeAreaWatch(watch, store);
}

export async function scrapeEnabledWatches(limit = 10) {
  const store = await getAggregatorStore();
  const watches = (await store.listWatches())
    .filter((watch) => watch.is_enabled)
    .slice(0, limit);
  const results = [];
  for (const watch of watches) {
    results.push(await scrapeAreaWatch(watch, store));
  }
  return { scraped: results.length, results };
}
