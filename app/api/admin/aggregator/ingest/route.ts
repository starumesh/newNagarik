import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { listingFingerprint } from "@/lib/scrapers/platforms/specs";
import { getAggregatorStore } from "@/lib/scrapers/store";
import { isOwnerPlatform } from "@/lib/scrapers/platforms";
import {
  parseBhk,
  parseRentAmount,
  plausibleRent,
  postedWithinTwoWeeks,
} from "@/lib/scrapers/web/parse";
import type { AggregatorPost, OwnerPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";

type IngestListing = {
  platform?: string;
  title?: string;
  url?: string | null;
  building_name?: string;
  city?: string;
  area?: string;
  bhk?: number | null;
  monthly_rent?: number | null;
  furnishing?: string | null;
  posted_at?: string | null;
};

export async function POST(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    city?: string;
    area?: string;
    listings?: IngestListing[];
  };

  const city = body.city?.trim();
  const area = body.area?.trim();
  const rows = body.listings ?? [];
  if (!city || !area || rows.length === 0) {
    return NextResponse.json(
      { error: "city, area, and listings[] are required." },
      { status: 400 }
    );
  }

  const seen = new Date().toISOString();
  const posts: AggregatorPost[] = [];

  for (const row of rows) {
    const platform = isOwnerPlatform(String(row.platform ?? "NoBroker"))
      ? (row.platform as OwnerPlatform)
      : "NoBroker";
    const title = row.title?.trim();
    if (!title) continue;
    const url = row.url?.trim() || null;
    const building = row.building_name?.trim() || area;
    const rent = parseRentAmount(row.monthly_rent);
    const bhk = row.bhk ?? parseBhk(title);
    const postedAt = row.posted_at ?? seen;
    if (!plausibleRent(rent, bhk)) continue;
    if (!postedWithinTwoWeeks(postedAt)) continue;
    const externalId = listingFingerprint({
      platform,
      url,
      title,
      building_name: building,
      monthly_rent: rent,
    });
    posts.push({
      id: `${platform}-${externalId}`,
      external_id: externalId,
      platform,
      title,
      building_name: building,
      city,
      area,
      bhk,
      monthly_rent: rent,
      furnishing: row.furnishing ?? null,
      url,
      rent_per_sqft: null,
      posted_by: "owner",
      posted_at: postedAt,
      first_seen_at: postedAt ?? seen,
      last_seen_at: seen,
    });
  }

  if (posts.length === 0) {
    return NextResponse.json({ error: "No valid listings in payload." }, { status: 400 });
  }

  const store = await getAggregatorStore();
  await store.saveWatch({ city, area });
  const { inserted } = await store.upsertListings(posts);
  return NextResponse.json({
    source: "mcp",
    fetched: posts.length,
    newCount: inserted.length,
    city,
    area,
  });
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
