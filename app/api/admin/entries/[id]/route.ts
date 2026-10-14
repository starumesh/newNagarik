import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { columnMissing } from "@/lib/catalog";
import { mergeAdminMeta } from "@/lib/admin-meta";
import { isR2Configured } from "@/lib/env";
import { presignListingUpload } from "@/lib/r2";
import type { FloorLevel, Furnishing, Parking, PowerBackup, TotalUnits } from "@/lib/types";

export const dynamic = "force-dynamic";

const PATCH_KEYS = [
  "monthly_rent",
  "maintenance",
  "bhk",
  "carpet_area",
  "floor_level",
  "furnishing",
  "total_units",
  "has_lift",
  "parking",
  "power_backup",
  "metro_distance",
  "is_hidden",
  "tags",
  "photos",
  "admin_score",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const key of PATCH_KEYS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  if (patch.monthly_rent != null) patch.monthly_rent = Number(patch.monthly_rent);
  if (patch.maintenance != null) patch.maintenance = Number(patch.maintenance);
  if (patch.bhk != null) patch.bhk = Number(patch.bhk);
  if (patch.carpet_area != null) patch.carpet_area = Number(patch.carpet_area);
  if (patch.metro_distance != null) {
    patch.metro_distance =
      patch.metro_distance === "" ? null : Number(patch.metro_distance);
  }
  if (patch.admin_score != null) {
    const score = Number(patch.admin_score);
    patch.admin_score = Number.isFinite(score) ? Math.min(10, Math.max(1, score)) : null;
  }
  if (Array.isArray(patch.tags)) {
    patch.tags = (patch.tags as unknown[])
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  if (Array.isArray(patch.photos)) {
    patch.photos = (patch.photos as unknown[])
      .map((url) => String(url).trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof patch.parking === "string") {
    patch.has_parking = patch.parking !== "no";
  }
  if (typeof patch.floor_level === "string") {
    patch.floor_level = patch.floor_level as FloorLevel;
  }
  if (typeof patch.furnishing === "string") {
    patch.furnishing = patch.furnishing as Furnishing;
  }
  if (typeof patch.total_units === "string") {
    patch.total_units = patch.total_units as TotalUnits;
  }
  if (typeof patch.power_backup === "string") {
    patch.power_backup = patch.power_backup as PowerBackup;
  }
  if (typeof patch.parking === "string") {
    patch.parking = patch.parking as Parking;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  let { data, error } = await admin
    .from("rent_entries")
    .update(patch)
    .eq("id", params.id)
    .select("*, locations(*)")
    .maybeSingle();

  if (error && columnMissing(error.message)) {
    const current = await admin
      .from("rent_entries")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    const insights = mergeAdminMeta(current.data?.local_insights, {
      hidden: patch.is_hidden as boolean | undefined,
      tags: patch.tags as string[] | undefined,
      photos: patch.photos as string[] | undefined,
      score: (patch.admin_score as number | null | undefined),
    });
    const fallback = { ...patch, local_insights: insights };
    delete fallback.is_hidden;
    delete fallback.tags;
    delete fallback.photos;
    delete fallback.admin_score;
    const retry = await admin
      .from("rent_entries")
      .update(fallback)
      .eq("id", params.id)
      .select("*, locations(*)")
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not update review." },
      { status: 500 }
    );
  }
  return NextResponse.json({ entry: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await admin.from("verification_logs").delete().eq("rent_entry_id", params.id);
  const { error } = await admin.from("rent_entries").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: "Could not delete this review." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { ok } = await getAdminSession();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Photo storage is not configured. Paste an image URL instead." },
      { status: 503 }
    );
  }
  const body = (await request.json()) as { fileName?: string; contentType?: string };
  if (!body.fileName || !body.contentType) {
    return NextResponse.json({ error: "Missing file metadata." }, { status: 400 });
  }
  const key = `reviews/${params.id}/${Date.now()}-${body.fileName.replace(/[^\w.\-]+/g, "")}`;
  const signed = await presignListingUpload(key, body.contentType);
  return NextResponse.json(signed);
}
