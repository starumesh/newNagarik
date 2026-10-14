import type { SupabaseClient } from "@supabase/supabase-js";
import { tableMissing } from "@/lib/catalog";
import { cacheGet, cacheSet, getRedis } from "@/lib/redis";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, env } from "@/lib/env";
import type {
  AggregatorAlert,
  AggregatorPlatform,
  AggregatorPost,
  AreaWatch,
  OwnerPlatform,
} from "@/lib/types";

export const AGGREGATOR_SQL_HINT =
  "Run supabase/migrations/007_aggregator_listings.sql in the Supabase SQL editor.";

const LISTINGS_KEY = "nn:aggregator:listings";
const MEMORY_TTL = 60 * 60 * 24 * 7;

const memory = {
  listings: [] as AggregatorPost[],
  watches: [] as AreaWatch[],
  alerts: [] as AggregatorAlert[],
};

export type ListingFilter = {
  city?: string;
  area?: string;
  platform?: AggregatorPlatform | "all";
  limit?: number;
};

type MemoryBag = {
  listings: AggregatorPost[];
  watches: AreaWatch[];
  alerts: AggregatorAlert[];
};

function matchListing(post: AggregatorPost, filter: ListingFilter) {
  if (filter.city && post.city.toLowerCase() !== filter.city.toLowerCase()) {
    return false;
  }
  if (filter.area && post.area.toLowerCase() !== filter.area.toLowerCase()) {
    return false;
  }
  if (
    filter.platform &&
    filter.platform !== "all" &&
    post.platform !== filter.platform
  ) {
    return false;
  }
  return true;
}

function sortPosts(posts: AggregatorPost[]) {
  return [...posts].sort((a, b) => {
    const aTime = Date.parse(a.posted_at ?? a.last_seen_at);
    const bTime = Date.parse(b.posted_at ?? b.last_seen_at);
    return bTime - aTime;
  });
}

async function readBag(): Promise<MemoryBag> {
  const cached = await cacheGet<MemoryBag>(LISTINGS_KEY);
  if (cached) return cached;
  return memory;
}

async function writeBag(bag: MemoryBag) {
  memory.listings = bag.listings;
  memory.watches = bag.watches;
  memory.alerts = bag.alerts;
  await cacheSet(LISTINGS_KEY, bag, MEMORY_TTL);
}

function isOwnerPlatforms(value: unknown): value is OwnerPlatform[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => item === "NoBroker" || item === "MagicBricks" || item === "MyGate"
    )
  );
}

function mapListingRow(row: Record<string, unknown>): AggregatorPost {
  return {
    id: String(row.id),
    external_id: String(row.external_id),
    platform: row.platform as AggregatorPost["platform"],
    title: String(row.title),
    building_name: String(row.building_name ?? ""),
    city: String(row.city),
    area: String(row.area),
    bhk: row.bhk == null ? null : Number(row.bhk),
    monthly_rent: row.monthly_rent == null ? null : Number(row.monthly_rent),
    furnishing: row.furnishing ? String(row.furnishing) : null,
    url: row.url ? String(row.url) : null,
    rent_per_sqft: row.rent_per_sqft == null ? null : Number(row.rent_per_sqft),
    posted_by: (row.posted_by as AggregatorPost["posted_by"]) ?? "unknown",
    posted_at: row.posted_at ? String(row.posted_at) : null,
    first_seen_at: String(row.first_seen_at),
    last_seen_at: String(row.last_seen_at),
  };
}

function mapWatchRow(row: Record<string, unknown>): AreaWatch {
  return {
    id: String(row.id),
    city: String(row.city),
    area: String(row.area),
    platforms: isOwnerPlatforms(row.platforms)
      ? row.platforms
      : ["NoBroker", "MagicBricks", "MyGate"],
    notify_email: row.notify_email ? String(row.notify_email) : null,
    is_enabled: Boolean(row.is_enabled),
    last_scraped_at: row.last_scraped_at ? String(row.last_scraped_at) : null,
  };
}

function mapAlertRow(row: Record<string, unknown>): AggregatorAlert {
  return {
    id: String(row.id),
    watch_id: row.watch_id ? String(row.watch_id) : null,
    listing_id: row.listing_id ? String(row.listing_id) : null,
    title: String(row.title),
    city: String(row.city),
    area: String(row.area),
    platform: row.platform as AggregatorPlatform,
    url: row.url ? String(row.url) : null,
    created_at: String(row.created_at),
    read_at: row.read_at ? String(row.read_at) : null,
  };
}

async function supabaseStore(admin: SupabaseClient) {
  return {
    missingSchema: false,
    usingFallback: false as const,

    async listListings(filter: ListingFilter = {}) {
      let query = admin
        .from("aggregator_listings")
        .select("*")
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(filter.limit ?? 120);
      if (filter.city) query = query.ilike("city", filter.city);
      if (filter.area) query = query.ilike("area", filter.area);
      if (filter.platform && filter.platform !== "all") {
        query = query.eq("platform", filter.platform);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => mapListingRow(row as Record<string, unknown>));
    },

    async pruneAreaListings(city: string, area: string, platforms: OwnerPlatform[]) {
      if (platforms.length === 0) return;
      const { error } = await admin
        .from("aggregator_listings")
        .delete()
        .ilike("city", city)
        .ilike("area", area)
        .in("platform", platforms);
      if (error) throw error;
    },

    async upsertListings(posts: AggregatorPost[]) {
      if (posts.length === 0) return { inserted: [] as AggregatorPost[], updated: 0 };
      const ids = Array.from(new Set(posts.map((post) => post.external_id)));
      const { data: existing } = await admin
        .from("aggregator_listings")
        .select("platform, external_id")
        .in("external_id", ids);
      const known = new Set(
        (existing ?? []).map((row) => `${row.platform}:${row.external_id}`)
      );
      const now = new Date().toISOString();
      const rows = posts.map((post) => ({
        platform: post.platform,
        external_id: post.external_id,
        title: post.title,
        building_name: post.building_name,
        city: post.city,
        area: post.area,
        bhk: post.bhk,
        monthly_rent: post.monthly_rent,
        furnishing: post.furnishing,
        url: post.url,
        rent_per_sqft: post.rent_per_sqft,
        posted_by: post.posted_by,
        posted_at: post.posted_at,
        last_seen_at: now,
      }));
      const { data, error } = await admin
        .from("aggregator_listings")
        .upsert(rows, { onConflict: "platform,external_id" })
        .select("*");
      if (error) throw error;
      const mapped = (data ?? []).map((row) =>
        mapListingRow(row as Record<string, unknown>)
      );
      const inserted = mapped.filter(
        (post) => !known.has(`${post.platform}:${post.external_id}`)
      );
      return { inserted, updated: mapped.length - inserted.length };
    },

    async listWatches() {
      const { data, error } = await admin
        .from("area_watches")
        .select("*")
        .order("city");
      if (error) throw error;
      return (data ?? []).map((row) => mapWatchRow(row as Record<string, unknown>));
    },

    async saveWatch(input: {
      city: string;
      area: string;
      platforms?: OwnerPlatform[];
      notify_email?: string | null;
      is_enabled?: boolean;
    }) {
      const { data, error } = await admin
        .from("area_watches")
        .upsert(
          {
            city: input.city,
            area: input.area,
            platforms: input.platforms ?? ["NoBroker", "MagicBricks", "MyGate"],
            notify_email: input.notify_email ?? env.adminEmail ?? null,
            is_enabled: input.is_enabled ?? true,
          },
          { onConflict: "city,area" }
        )
        .select("*")
        .single();
      if (error) throw error;
      return mapWatchRow(data as Record<string, unknown>);
    },

    async touchWatch(id: string) {
      await admin
        .from("area_watches")
        .update({ last_scraped_at: new Date().toISOString() })
        .eq("id", id);
    },

    async removeWatch(id: string) {
      const { error } = await admin.from("area_watches").delete().eq("id", id);
      if (error) throw error;
    },

    async listAlerts(unreadOnly = false) {
      let query = admin
        .from("aggregator_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);
      if (unreadOnly) query = query.is("read_at", null);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => mapAlertRow(row as Record<string, unknown>));
    },

    async addAlerts(alerts: Omit<AggregatorAlert, "id" | "created_at" | "read_at">[]) {
      if (alerts.length === 0) return;
      const { error } = await admin.from("aggregator_alerts").insert(alerts);
      if (error) throw error;
    },

    async markAlertsRead(ids?: string[]) {
      const now = new Date().toISOString();
      let query = admin.from("aggregator_alerts").update({ read_at: now });
      query = ids?.length ? query.in("id", ids) : query.is("read_at", null);
      const { error } = await query;
      if (error) throw error;
    },
  };
}

function fallbackStore(usingRedis: boolean) {
  return {
    missingSchema: true,
    usingFallback: true as const,
    fallback: usingRedis ? ("redis" as const) : ("memory" as const),

    async listListings(filter: ListingFilter = {}) {
      const bag = await readBag();
      return sortPosts(bag.listings.filter((post) => matchListing(post, filter))).slice(
        0,
        filter.limit ?? 120
      );
    },

    async pruneAreaListings(city: string, area: string, platforms: OwnerPlatform[]) {
      const bag = await readBag();
      bag.listings = bag.listings.filter(
        (post) =>
          !(
            post.city.toLowerCase() === city.toLowerCase() &&
            post.area.toLowerCase() === area.toLowerCase() &&
            platforms.includes(post.platform as OwnerPlatform)
          )
      );
      await writeBag(bag);
    },

    async upsertListings(posts: AggregatorPost[]) {
      const bag = await readBag();
      const known = new Set(
        bag.listings.map((post) => `${post.platform}:${post.external_id}`)
      );
      const now = new Date().toISOString();
      const inserted: AggregatorPost[] = [];
      for (const post of posts) {
        const key = `${post.platform}:${post.external_id}`;
        const existing = bag.listings.find(
          (row) => `${row.platform}:${row.external_id}` === key
        );
        if (existing) {
          Object.assign(existing, post, {
            id: existing.id,
            first_seen_at: existing.first_seen_at,
            last_seen_at: now,
          });
        } else {
          const created: AggregatorPost = {
            ...post,
            id: crypto.randomUUID(),
            first_seen_at: post.first_seen_at || now,
            last_seen_at: now,
          };
          bag.listings.unshift(created);
          inserted.push(created);
        }
      }
      bag.listings = bag.listings.slice(0, 500);
      await writeBag(bag);
      return { inserted, updated: posts.length - inserted.length };
    },

    async listWatches() {
      const bag = await readBag();
      return bag.watches;
    },

    async saveWatch(input: {
      city: string;
      area: string;
      platforms?: OwnerPlatform[];
      notify_email?: string | null;
      is_enabled?: boolean;
    }) {
      const bag = await readBag();
      const existing = bag.watches.find(
        (watch) =>
          watch.city.toLowerCase() === input.city.toLowerCase() &&
          watch.area.toLowerCase() === input.area.toLowerCase()
      );
      const watch: AreaWatch = {
        id: existing?.id ?? crypto.randomUUID(),
        city: input.city,
        area: input.area,
        platforms: input.platforms ?? ["NoBroker", "MagicBricks", "MyGate"],
        notify_email: input.notify_email ?? env.adminEmail ?? null,
        is_enabled: input.is_enabled ?? true,
        last_scraped_at: existing?.last_scraped_at ?? null,
      };
      bag.watches = [
        watch,
        ...bag.watches.filter((row) => row.id !== watch.id),
      ];
      await writeBag(bag);
      return watch;
    },

    async touchWatch(id: string) {
      const bag = await readBag();
      const watch = bag.watches.find((row) => row.id === id);
      if (watch) watch.last_scraped_at = new Date().toISOString();
      await writeBag(bag);
    },

    async removeWatch(id: string) {
      const bag = await readBag();
      bag.watches = bag.watches.filter((watch) => watch.id !== id);
      await writeBag(bag);
    },

    async listAlerts(unreadOnly = false) {
      const bag = await readBag();
      return bag.alerts
        .filter((alert) => (unreadOnly ? !alert.read_at : true))
        .slice(0, 80);
    },

    async addAlerts(alerts: Omit<AggregatorAlert, "id" | "created_at" | "read_at">[]) {
      if (alerts.length === 0) return;
      const bag = await readBag();
      const now = new Date().toISOString();
      bag.alerts = [
        ...alerts.map((alert) => ({
          ...alert,
          id: crypto.randomUUID(),
          created_at: now,
          read_at: null,
        })),
        ...bag.alerts,
      ].slice(0, 200);
      await writeBag(bag);
    },

    async markAlertsRead(ids?: string[]) {
      const bag = await readBag();
      const now = new Date().toISOString();
      for (const alert of bag.alerts) {
        if (ids?.length && !ids.includes(alert.id)) continue;
        if (!alert.read_at) alert.read_at = now;
      }
      await writeBag(bag);
    },
  };
}

export type AggregatorStore = Awaited<ReturnType<typeof getAggregatorStore>>;

export async function getAggregatorStore() {
  if (isSupabaseConfigured() && env.supabaseServiceRoleKey) {
    try {
      const admin = createAdminClient();
      const probe = await admin.from("aggregator_listings").select("id").limit(1);
      if (!probe.error) return supabaseStore(admin);
      if (!tableMissing(probe.error.message)) throw probe.error;
    } catch {
      // Tables missing or service role unavailable — use local fallback.
    }
  }
  return fallbackStore(Boolean(getRedis()));
}

export function platformCounts(posts: AggregatorPost[]) {
  return posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.platform] = (acc[post.platform] ?? 0) + 1;
    return acc;
  }, {});
}
