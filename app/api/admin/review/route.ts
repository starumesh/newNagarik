import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIdentity } from "@/lib/hash";
import { computeTrustScore } from "@/lib/trust";

export const dynamic = "force-dynamic";

type ReviewAction = "approve" | "reject" | "reopen";

async function hashesForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  return hashIdentity(
    authUser.user?.email,
    (authUser.user?.user_metadata?.phone as string | undefined) ?? null
  );
}

async function unbanIdentities(
  admin: ReturnType<typeof createAdminClient>,
  emailHash: string | null,
  phoneHash: string | null
) {
  if (emailHash) {
    await admin.from("banned_identities").delete().eq("identity_hash", emailHash);
    await admin
      .from("identity_hashes")
      .update({ is_banned: false })
      .eq("email_hash", emailHash);
  }
  if (phoneHash) {
    await admin.from("banned_identities").delete().eq("identity_hash", phoneHash);
    await admin
      .from("identity_hashes")
      .update({ is_banned: false })
      .eq("phone_hash", phoneHash);
  }
}

async function restoreContributor(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("purpose")
    .eq("id", userId)
    .maybeSingle();

  const { data: entries } = await admin
    .from("rent_entries")
    .select("verification_status")
    .eq("user_id", userId);

  const hasApproved = (entries ?? []).some(
    (row) => row.verification_status === "auto_approved"
  );

  await admin
    .from("user_profiles")
    .update({
      role: "renter",
      trust_score: computeTrustScore({
        role: "renter",
        purpose: profile?.purpose,
        verificationStatus: hasApproved ? "auto_approved" : "under_review",
      }),
      restricted_until: null,
    })
    .eq("id", userId);
}

export async function POST(request: NextRequest) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    entryId?: string;
    action?: ReviewAction;
  };
  if (!body.entryId || !body.action) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (!["approve", "reject", "reopen"].includes(body.action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
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

  if (body.action === "reopen") {
    await admin
      .from("rent_entries")
      .update({ verification_status: "under_review" })
      .eq("id", body.entryId);
    await restoreContributor(admin, entry.user_id);
    return NextResponse.json({ ok: true, status: "under_review" });
  }

  if (body.action === "approve") {
    await admin
      .from("rent_entries")
      .update({ verification_status: "auto_approved" })
      .eq("id", body.entryId);

    const { emailHash, phoneHash } = await hashesForUser(admin, entry.user_id);
    await unbanIdentities(admin, emailHash, phoneHash);
    await restoreContributor(admin, entry.user_id);
    return NextResponse.json({ ok: true, status: "auto_approved" });
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
      trust_score: computeTrustScore({
        role: "explorer",
        purpose: "view_trends",
      }),
      restricted_until: restrictedUntil.toISOString(),
    })
    .eq("id", entry.user_id);

  const { emailHash, phoneHash } = await hashesForUser(admin, entry.user_id);

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

  return NextResponse.json({ ok: true, status: "rejected", banned: true });
}
