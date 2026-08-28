import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MACRO_TRENDS } from "@/lib/data/trends";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("market_snapshots")
      .select("city, locality, avg_rent, yoy_change, demand_index")
      .limit(15);
    if (data && data.length > 0) {
      return NextResponse.json({ snapshots: data });
    }
  } catch {
    // Fall through to static macro data.
  }
  return NextResponse.json({ snapshots: MACRO_TRENDS.slice(0, 15) });
}
