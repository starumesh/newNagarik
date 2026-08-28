import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rent_entries")
    .select("*, locations(*), verification_logs(*)")
    .eq("verification_status", "under_review")
    .order("submitted_at", { ascending: false })
    .limit(15);

  if (error) {
    return NextResponse.json({ error: "Could not load queue." }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}
