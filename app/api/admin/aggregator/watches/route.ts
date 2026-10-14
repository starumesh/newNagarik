import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { env } from "@/lib/env";
import { isOwnerPlatform } from "@/lib/scrapers/platforms";
import { getAggregatorStore } from "@/lib/scrapers/store";
import type { OwnerPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    city?: string;
    area?: string;
    platforms?: string[];
    notify_email?: string | null;
  };

  const city = body.city?.trim();
  const area = body.area?.trim();
  if (!city || !area) {
    return NextResponse.json(
      { error: "City and area are required." },
      { status: 400 }
    );
  }

  const platforms = (body.platforms ?? []).filter(isOwnerPlatform);
  const store = await getAggregatorStore();
  const watch = await store.saveWatch({
    city,
    area,
    platforms:
      platforms.length > 0
        ? (platforms as OwnerPlatform[])
        : ["NoBroker", "MagicBricks", "MyGate"],
    notify_email: body.notify_email ?? env.adminEmail ?? null,
  });

  return NextResponse.json({ watch });
}

export async function DELETE(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Watch id required." }, { status: 400 });
  }

  const store = await getAggregatorStore();
  await store.removeWatch(id);
  return NextResponse.json({ ok: true });
}
