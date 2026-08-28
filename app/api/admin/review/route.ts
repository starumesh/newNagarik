import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIdentity } from "@/lib/hash";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    entryId?: string;
    action?: "approve" | "reject";
  };
  if (!body.entryId || !body.action) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("rent_entries")
    .select("*")
    .eq("id", body.entryId)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  if (body.action === "approve") {
    await admin
      .from("rent_entries")
      .update({ verification_status: "auto_approved" })
      .eq("id", body.entryId);
    await admin
      .from("user_profiles")
      .update({ role: "renter", trust_score: 100, restricted_until: null })
      .eq("id", entry.user_id);
    return NextResponse.json({ ok: true });
  }

  await admin
    .from("rent_entries")
    .update({ verification_status: "rejected" })
    .eq("id", body.entryId);

  const restrictedUntil = new Date();
  restrictedUntil.setMonth(restrictedUntil.getMonth() + 6);

  await admin
    .from("user_profiles")
    .update({
      role: "explorer",
      trust_score: 0,
      restricted_until: restrictedUntil.toISOString(),
    })
    .eq("id", entry.user_id);

  const { data: authUser } = await admin.auth.admin.getUserById(entry.user_id);
  const { emailHash, phoneHash } = hashIdentity(
    authUser.user?.email,
    (authUser.user?.user_metadata?.phone as string | undefined) ?? null
  );

  if (emailHash) {
    await admin.from("banned_identities").upsert({
      identity_hash: emailHash,
      hash_type: "email",
      reason: "Admin rejected flagged rent entry",
    });
    await admin
      .from("identity_hashes")
      .update({ is_banned: true })
      .eq("email_hash", emailHash);
  }
  if (phoneHash) {
    await admin.from("banned_identities").upsert({
      identity_hash: phoneHash,
      hash_type: "phone",
      reason: "Admin rejected flagged rent entry",
    });
  }

  return NextResponse.json({ ok: true, banned: true });
}
