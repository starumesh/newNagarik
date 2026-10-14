import { allowDemoAreaFeed, demoAreaPosts } from "@/lib/scrapers/platforms/demo";
import { fetchLiveAreaPosts } from "@/lib/scrapers/platforms/fetch";
import { preferOwnerPosts } from "@/lib/scrapers/platforms/owner";
import {
  OWNER_PLATFORMS,
  OWNER_PLATFORM_SPECS,
  type AreaQuery,
} from "@/lib/scrapers/platforms/specs";
import { fetchWebAreaPosts } from "@/lib/scrapers/web";
import { postedWithinTwoWeeks } from "@/lib/scrapers/web/parse";
import type { AggregatorPost, OwnerPlatform } from "@/lib/types";

export { OWNER_PLATFORMS, OWNER_PLATFORM_SPECS };
export type { AreaQuery };

export type PlatformScrapeResult = {
  platform: OwnerPlatform;
  source: "web" | "live" | "demo" | "none";
  count: number;
};

export function isOwnerPlatform(value: string): value is OwnerPlatform {
  return OWNER_PLATFORMS.includes(value as OwnerPlatform);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAreaListings(
  query: AreaQuery,
  platforms: OwnerPlatform[] = OWNER_PLATFORMS
): Promise<{
  posts: AggregatorPost[];
  source: "web" | "live" | "demo" | "none";
  platforms: PlatformScrapeResult[];
}> {
  const posts: AggregatorPost[] = [];
  const breakdown: PlatformScrapeResult[] = [];

  for (const platform of platforms) {
    const web = await fetchWebAreaPosts(query, platform);
    if (web.fetched) {
      posts.push(...web.posts);
      breakdown.push({
        platform,
        source: "web",
        count: web.posts.length,
      });
      await sleep(400);
      continue;
    }

    const live = preferOwnerPosts(await fetchLiveAreaPosts(query, platform)).filter(
      (post) => post.posted_by === "owner" && postedWithinTwoWeeks(post.posted_at)
    );
    if (live.length > 0) {
      posts.push(...live);
      breakdown.push({ platform, source: "live", count: live.length });
      continue;
    }

    breakdown.push({ platform, source: "none", count: 0 });
  }

  const usedWeb = breakdown.some((row) => row.source === "web");
  const usedLive = breakdown.some((row) => row.source === "live" && row.count > 0);

  if (posts.length === 0 && !usedWeb && allowDemoAreaFeed()) {
    for (const platform of platforms) {
      const demo = demoAreaPosts(query, platform);
      posts.push(...demo);
      const row = breakdown.find((item) => item.platform === platform);
      if (row) {
        row.source = "demo";
        row.count = demo.length;
      }
    }
  }

  posts.sort((a, b) => {
    const aTime = Date.parse(a.posted_at ?? a.last_seen_at);
    const bTime = Date.parse(b.posted_at ?? b.last_seen_at);
    return bTime - aTime;
  });

  if (posts.length === 0) return { posts, source: "none", platforms: breakdown };
  return {
    posts,
    source: usedWeb ? "web" : usedLive ? "live" : "demo",
    platforms: breakdown,
  };
}

export function platformSearchLinks(query: AreaQuery) {
  return OWNER_PLATFORMS.map((platform) => ({
    platform,
    url: OWNER_PLATFORM_SPECS[platform].searchUrl(query),
  }));
}
