import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { getAggregatorStore } from "@/lib/scrapers/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadOnly =
    new URL(request.url).searchParams.get("unread") === "1";
  const store = await getAggregatorStore();
  const alerts = await store.listAlerts(unreadOnly);
  return NextResponse.json({
    alerts,
    unreadCount: unreadOnly
      ? alerts.length
      : alerts.filter((alert) => !alert.read_at).length,
  });
}

export async function PATCH(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { ids?: string[]; all?: boolean };
  const store = await getAggregatorStore();
  await store.markAlertsRead(body.all ? undefined : body.ids);
  return NextResponse.json({ ok: true });
}
