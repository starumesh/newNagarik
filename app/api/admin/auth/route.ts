import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue } from "@/lib/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { secret?: string };
  if (!env.adminSecret || body.secret !== env.adminSecret) {
    return NextResponse.json({ error: "Invalid admin secret." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
