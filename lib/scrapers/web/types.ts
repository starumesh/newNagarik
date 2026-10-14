import type { AggregatorPost } from "@/lib/types";

export type WebScrapeResult = {
  posts: AggregatorPost[];
  fetched: boolean;
};
