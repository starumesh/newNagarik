import { NextRequest, NextResponse } from "next/server";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { env, isSupabaseConfigured } from "@/lib/env";
import { normalizeIndianPhone, phoneToInternalEmail } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const limited = await limitByIp(clientIp(request), "phone-otp", 12);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = (await request.json()) as { phone?: string };
  const phone = normalizeIndianPhone(body.phone ?? "");
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    phone,
    email: phoneToInternalEmail(phone),
    hardcoded: true,
    hint: `SMS is not wired yet. Use code ${env.phoneOtp}.`,
  });
}
