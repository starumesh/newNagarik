import type { ListingPoster, OwnerPlatform } from "@/lib/types";

const BROKER =
  /\b(broker|brokers|agent|dealer|realty|consultant|channel partner)\b/i;
const OWNER = /\b(owner|landlord|direct owner|posted by owner)\b/i;

export function classifyPoster(
  raw: Record<string, unknown>,
  platform: OwnerPlatform
): ListingPoster {
  const blob = [
    raw.postedBy,
    raw.posted_by,
    raw.advertiser,
    raw.ownerType,
    raw.advertiser_type,
    raw.title,
    raw.description,
    raw.snippet,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");

  if (BROKER.test(blob) && !OWNER.test(blob)) return "broker";
  if (OWNER.test(blob)) return "owner";
  if (platform === "NoBroker" || platform === "MyGate") return "owner";
  return "unknown";
}

export function preferOwnerPosts<T extends { posted_by: ListingPoster }>(
  posts: T[]
): T[] {
  const owners = posts.filter((post) => post.posted_by !== "broker");
  return owners.length > 0 ? owners : posts;
}
