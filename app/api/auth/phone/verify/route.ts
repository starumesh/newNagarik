import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import { env, isSupabaseConfigured } from "@/lib/env";
import {
  normalizeIndianPhone,
  phoneAuthEmails,
  phoneToInternalEmail,
} from "@/lib/phone";

export const dynamic = "force-dynamic";

type LinkResult = {
  email: string;
  userId: string;
  tokenHash: string;
};

async function magicLinkForEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<LinkResult | null> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = data?.properties?.hashed_token;
  const userId = data?.user?.id;
  if (error || !tokenHash || !userId) return null;
  return { email, userId, tokenHash };
}

/** Prefer an account that already finished onboarding when duplicates exist. */
async function pickBestExistingLink(
  admin: ReturnType<typeof createAdminClient>,
  phone: string
): Promise<LinkResult | null> {
  const candidates: LinkResult[] = [];
  for (const email of phoneAuthEmails(phone)) {
    const link = await magicLinkForEmail(admin, email);
    if (link) candidates.push(link);
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const ids = candidates.map((c) => c.userId);
  const { data: profiles } = await admin
    .from("user_profiles")
    .select("id, onboarding_completed")
    .in("id", ids);

  const completed = new Set(
    (profiles ?? [])
      .filter((row) => row.onboarding_completed)
      .map((row) => row.id as string)
  );

  return (
    candidates.find((c) => completed.has(c.userId)) ??
    // Prefer legacy rentsahih account if neither/both completed
    candidates.find((c) => c.email.includes("@phone.rentsahih.internal")) ??
    candidates[0]
  );
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const limited = await limitByIp(clientIp(request), "phone-verify", 20);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = (await request.json()) as { phone?: string; otp?: string };
  const phone = normalizeIndianPhone(body.phone ?? "");
  const otp = (body.otp ?? "").trim();
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number." },
      { status: 400 }
    );
  }
  if (otp !== env.phoneOtp) {
    return NextResponse.json({ error: "Invalid code." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Reuse existing auth user (including pre-rebrand emails) — never create a
  // duplicate empty profile that forces onboarding again.
  let link = await pickBestExistingLink(admin, phone);

  if (!link) {
    const email = phoneToInternalEmail(phone);
    const baseUser = {
      email,
      email_confirm: true as const,
      user_metadata: { phone, auth_via: "phone_otp" },
    };

    let createError = (
      await admin.auth.admin.createUser({
        ...baseUser,
        phone,
        phone_confirm: true,
      })
    ).error;

    if (createError && /phone/i.test(createError.message)) {
      createError = (await admin.auth.admin.createUser(baseUser)).error;
    }

    if (createError && !/already|registered|exists/i.test(createError.message)) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    link = await magicLinkForEmail(admin, email);
    if (!link) {
      // Race: account exists under a candidate email after create conflict
      link = await pickBestExistingLink(admin, phone);
    }
  }

  if (!link) {
    return NextResponse.json(
      { error: "Could not start a session." },
      { status: 500 }
    );
  }

  // Keep phone metadata fresh on the chosen account
  await admin.auth.admin.updateUserById(link.userId, {
    user_metadata: { phone, auth_via: "phone_otp" },
  });

  const { data: profile } = await admin
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("id", link.userId)
    .maybeSingle();

  const next = profile?.onboarding_completed ? "/dashboard" : "/onboarding";

  return NextResponse.json({
    ok: true,
    email: link.email,
    token_hash: link.tokenHash,
    next,
  });
}
