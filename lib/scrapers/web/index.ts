import type { AreaQuery } from "@/lib/scrapers/platforms/specs";
import { scrapeMagicBricks } from "@/lib/scrapers/web/magicbricks";
import { scrapeNoBroker } from "@/lib/scrapers/web/nobroker";
import type { AggregatorPost, OwnerPlatform } from "@/lib/types";

export type WebScrapeSource = "web" | "none";

export async function fetchWebAreaPosts(
  query: AreaQuery,
  platform: OwnerPlatform
): Promise<{ posts: AggregatorPost[]; source: WebScrapeSource; fetched: boolean }> {
  try {
    if (platform === "NoBroker") {
      const result = await scrapeNoBroker(query);
      return {
        posts: result.posts,
        fetched: result.fetched,
        source: result.fetched ? "web" : "none",
      };
    }
    if (platform === "MagicBricks") {
      const result = await scrapeMagicBricks(query);
      return {
        posts: result.posts,
        fetched: result.fetched,
        source: result.fetched ? "web" : "none",
      };
    }
    return { posts: [], source: "none", fetched: false };
  } catch {
    return { posts: [], source: "none", fetched: false };
  }
}
