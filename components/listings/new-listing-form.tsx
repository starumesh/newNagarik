"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CITIES, areasForCity, buildingsForArea } from "@/lib/data/cities";

export function NewListingForm() {
  const [city, setCity] = useState<(typeof CITIES)[number]>("Bengaluru");
  const [area, setArea] = useState("Whitefield");
  const [building, setBuilding] = useState("Prestige Lakeside Habitat");
  const [asking, setAsking] = useState(45000);
  const [bhk, setBhk] = useState(2);
  const [furnishing, setFurnishing] = useState("semi");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const signed = await fetch("/api/listings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    if (!signed.ok) {
      setUploading(false);
      toast.error("Photo storage is not configured.");
      return;
    }
    const { uploadUrl, publicUrl } = await signed.json();
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    setUploading(false);
    if (!put.ok) {
      toast.error("Upload failed.");
      return;
    }
    setPhotos((current) => [...current, publicUrl]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const loc = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city,
        area,
        building_name: building,
      }),
    });
    const locationJson = await loc.json();
    if (!loc.ok) {
      toast.error("Could not save location.");
      return;
    }
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: locationJson.location.id,
        asking_rent: asking,
        bhk,
        furnishing,
        photos,
      }),
    });
    if (!response.ok) {
      toast.error("Could not create listing.");
      return;
    }
    toast.success("Listing is live for verified users.");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 ledger-card p-6">
      <h1 className="font-serif text-3xl text-navy">List a home</h1>
      <div className="space-y-2">
        <Label>City</Label>
        <select
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={city}
          onChange={(event) => {
            const next = event.target.value as (typeof CITIES)[number];
            setCity(next);
            const nextArea = areasForCity(next)[0] ?? "";
            setArea(nextArea);
            setBuilding(buildingsForArea(nextArea)[0] ?? "");
          }}
        >
          {CITIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Area</Label>
        <Input className="h-11" value={area} onChange={(event) => setArea(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Building</Label>
        <Input
          className="h-11"
          value={building}
          onChange={(event) => setBuilding(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Asking rent (₹)</Label>
          <Input
            type="number"
            className="h-11"
            value={asking}
            onChange={(event) => setAsking(Number(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>BHK</Label>
          <Input
            type="number"
            className="h-11"
            value={bhk}
            onChange={(event) => setBhk(Number(event.target.value))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Furnishing</Label>
        <select
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={furnishing}
          onChange={(event) => setFurnishing(event.target.value)}
        >
          <option value="unfurnished">Unfurnished</option>
          <option value="semi">Semi</option>
          <option value="fully">Fully</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Photos (Cloudflare R2)</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {uploading ? <p className="text-xs">Uploading…</p> : null}
        <div className="flex flex-wrap gap-2">
          {photos.map((url) => (
            <span key={url} className="truncate text-xs text-teal-700">
              saved
            </span>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full rounded-full">
        Publish listing
      </Button>
    </form>
  );
}
