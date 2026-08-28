import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessGranularData } from "@/lib/access";
import { sendInquiryEmail } from "@/lib/email";
import { messageSchema } from "@/lib/validations";
import { clientIp, limitByIp } from "@/lib/rate-limit";
import type { UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: true })
    .limit(15);

  if (error) {
    return NextResponse.json({ error: "Could not load inbox." }, { status: 500 });
  }
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const limited = await limitByIp(clientIp(request), "messages", 20);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many messages." }, { status: 429 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!canAccessGranularData(profile as UserProfile | null)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  const admin = createAdminClient();
  let receiverId: string | null = null;
  let ownerEmail: string | null = null;

  if (parsed.data.listingId) {
    const { data: listing } = await admin
      .from("property_listings")
      .select("owner_id, locations(building_name)")
      .eq("id", parsed.data.listingId)
      .maybeSingle();
    receiverId = listing?.owner_id ?? null;
    if (receiverId) {
      const { data: ownerAuth } = await admin.auth.admin.getUserById(receiverId);
      ownerEmail = ownerAuth.user?.email ?? null;
    }
  }

  const { error } = await admin.from("messages").insert({
    listing_id: parsed.data.listingId ?? null,
    external_ref: parsed.data.externalRef ?? null,
    building_name: parsed.data.buildingName,
    sender_id: user.id,
    receiver_id: receiverId,
    content: parsed.data.content,
  });

  if (error) {
    return NextResponse.json({ error: "Could not send inquiry." }, { status: 500 });
  }

  if (ownerEmail) {
    try {
      await sendInquiryEmail({
        to: ownerEmail,
        buildingName: parsed.data.buildingName,
      });
    } catch {
      // Dual notification: in-app is source of truth; email is best-effort.
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("receiver_id", user.id);

  return NextResponse.json({ ok: true });
}
