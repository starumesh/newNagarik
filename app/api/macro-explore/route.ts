import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import {
  getMacroExplorePack,
  isExploreCity,
  staticMacroPack,
} from "@/lib/macro-llm";
import { isLlmConfigured } from "@/lib/llm";
import type { CityName } from "@/lib/data/cities";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const limited = await limitByIp(clientIp(request), "macro-explore", 30);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many trend requests." }, { status: 429 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cityParam = request.nextUrl.searchParams.get("city")?.trim() || "Bengaluru";
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!isExploreCity(cityParam)) {
    return NextResponse.json(
      { error: "Pick one of the supported explore cities." },
      { status: 400 }
    );
  }

  const city = cityParam as CityName;

  try {
    const pack = await getMacroExplorePack(city, { refresh });
    return NextResponse.json({
      ...pack,
      llm_configured: isLlmConfigured(),
    });
  } catch (error) {
    const fallback = staticMacroPack(city);
    return NextResponse.json({
      ...fallback,
      llm_configured: isLlmConfigured(),
      warning:
        error instanceof Error
          ? error.message
          : "Live trends unavailable — showing curated baseline.",
    });
  }
}
