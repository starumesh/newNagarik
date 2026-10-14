"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RentEntry } from "@/lib/types";

const fieldClass =
  "h-10 border-white/15 bg-[#070b14] text-cream placeholder:text-slate-500";

export function ReviewControls({
  entry,
  acting,
  onRefresh,
}: {
  entry: RentEntry;
  acting: boolean;
  onRefresh: (id?: string) => Promise<void>;
}) {
  const [rent, setRent] = useState(String(entry.monthly_rent));
  const [maintenance, setMaintenance] = useState(String(entry.maintenance ?? 0));
  const [bhk, setBhk] = useState(String(entry.bhk));
  const [carpet, setCarpet] = useState(String(entry.carpet_area));
  const [score, setScore] = useState(
    entry.admin_score != null ? String(entry.admin_score) : ""
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(entry.tags ?? []);
  const [photos, setPhotos] = useState<string[]>(entry.photos ?? []);
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRent(String(entry.monthly_rent));
    setMaintenance(String(entry.maintenance ?? 0));
    setBhk(String(entry.bhk));
    setCarpet(String(entry.carpet_area));
    setScore(entry.admin_score != null ? String(entry.admin_score) : "");
    setTags(entry.tags ?? []);
    setPhotos(entry.photos ?? []);
    setTagInput("");
    setPhotoUrl("");
  }, [
    entry.id,
    entry.monthly_rent,
    entry.maintenance,
    entry.bhk,
    entry.carpet_area,
    entry.admin_score,
    entry.tags,
    entry.photos,
  ]);

  const dirty =
    Number(rent) !== entry.monthly_rent ||
    Number(maintenance) !== (entry.maintenance ?? 0) ||
    Number(bhk) !== entry.bhk ||
    Number(carpet) !== entry.carpet_area ||
    (score ? Number(score) : null) !== (entry.admin_score ?? null) ||
    tags.join("|") !== (entry.tags ?? []).join("|") ||
    photos.join("|") !== (entry.photos ?? []).join("|");

  async function patch(body: Record<string, unknown>, okMessage: string) {
    setSaving(true);
    const response = await fetch(`/api/admin/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(json.error ?? "Could not save.");
      return false;
    }
    toast.success(okMessage);
    await onRefresh(entry.id);
    return true;
  }

  async function saveEdits() {
    if (!dirty) {
      toast.message("No changes to save.");
      return;
    }
    await patch(
      {
        monthly_rent: Number(rent),
        maintenance: Number(maintenance),
        bhk: Number(bhk),
        carpet_area: Number(carpet),
        admin_score: score ? Number(score) : null,
        tags,
        photos,
      },
      "Review updated."
    );
  }

  async function addTag() {
    const next = tagInput.trim();
    if (!next || tags.includes(next)) return;
    setTags([...tags, next]);
    setTagInput("");
  }

  async function addPhoto() {
    const next = photoUrl.trim();
    if (!next) return;
    setPhotos([...photos, next]);
    setPhotoUrl("");
  }

  const busy = acting || saving;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Change the numbers, score, tags, or images, then save. Status is
        changed from the bar above — not here.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Monthly rent (₹)">
          <Input className={fieldClass} value={rent} onChange={(e) => setRent(e.target.value)} />
        </Field>
        <Field label="Maintenance (₹)">
          <Input
            className={fieldClass}
            value={maintenance}
            onChange={(e) => setMaintenance(e.target.value)}
          />
        </Field>
        <Field label="BHK">
          <Input className={fieldClass} value={bhk} onChange={(e) => setBhk(e.target.value)} />
        </Field>
        <Field label="Carpet (sqft)">
          <Input
            className={fieldClass}
            value={carpet}
            onChange={(e) => setCarpet(e.target.value)}
          />
        </Field>
        <Field label="Admin score (1–10)">
          <Input
            className={fieldClass}
            inputMode="numeric"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Not scored"
          />
        </Field>
      </div>

      <div>
        <Label className="text-slate-400">Tags</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.length === 0 ? (
            <p className="text-xs text-slate-500">No tags yet.</p>
          ) : (
            tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-cream hover:bg-red-500/20"
              >
                {tag} ×
              </button>
            ))
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            className={fieldClass}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="e.g. overpriced, needs photos"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addTag();
              }
            }}
          />
          <Button
            variant="outline"
            className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
            disabled={busy}
            onClick={() => void addTag()}
          >
            Add
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-slate-400">Images</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {photos.map((url) => (
            <div key={url} className="relative overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos(photos.filter((item) => item !== url))}
                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-cream"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            className={fieldClass}
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Paste image URL"
          />
          <Button
            variant="outline"
            className="rounded-full border-white/20 bg-transparent text-cream hover:bg-white/10"
            disabled={busy}
            onClick={() => void addPhoto()}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-[#121a2a] py-3">
        <p className="text-xs text-slate-500">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <Button
          className="rounded-full bg-brass px-5 text-navy hover:bg-brass/90"
          disabled={busy || !dirty}
          onClick={() => void saveEdits()}
        >
          {saving ? "Saving…" : "Save edits"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-400">{label}</Label>
      {children}
    </div>
  );
}
