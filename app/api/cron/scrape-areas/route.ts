import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { scrapeEnabledWatches } from "@/lib/scrapers/area-feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = request.nextUrl.searchParams.get("secret") ?? "";
  const provided = bearer || query;
  if (env.cronSecret) return provided === env.cronSecret;
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await scrapeEnabledWatches();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
