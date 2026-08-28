import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(searchParams.get("code") ?? "");
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
