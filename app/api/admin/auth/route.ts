import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Use /admin/login with email and password." }, { status: 410 });
}

export async function GET() {
  const { ok } = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
