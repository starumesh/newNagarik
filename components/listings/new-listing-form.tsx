"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildingsForArea } from "@/lib/data/cities";
import { usePublicCatalog } from "@/lib/use-public-catalog";

function readPositive(raw: string, fallback: number): number {
  if (raw === "") return fallback;
  const next = Number(raw);
  if (!Number.isFinite(next) || next <= 0) {
    toast.message("Please enter a positive number.");
    return fallback;
  }
  return Math.floor(next);
}

export function NewListingForm() {
  const { cities, areasFor } = usePublicCatalog();
  const [city, setCity] = useState("Bengaluru");
  const [area, setArea] = useState("Whitefield");
  const [building, setBuilding] = useState("Prestige Lakeside Habitat");
  const [asking, setAsking] = useState(45000);
  const [bhk, setBhk] = useState(2);
  const [carpet, setCarpet] = useState(1100);
  const [furnishing, setFurnishing] = useState("semi");
  const [maintenanceStatus, setMaintenanceStatus] = useState<
    "included" | "extra" | "none"
  >("extra");
  const [maintenanceAmount, setMaintenanceAmount] = useState(2500);
  const [petFriendly, setPetFriendly] = useState<"yes" | "no" | "case_by_case">(
    "case_by_case"
  );
  const [petCaseNotes, setPetCaseNotes] = useState("");
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
      toast.message("Photo storage isn’t set up yet. You can publish without photos.");
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
      toast.message("We couldn’t upload that photo. Please try again.");
      return;
    }
    setPhotos((current) => [...current, publicUrl]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (asking <= 0 || bhk <= 0 || carpet <= 0) {
      toast.message("Please enter positive values for rent, BHK, and carpet area.");
      return;
    }
    if (maintenanceStatus === "extra" && maintenanceAmount <= 0) {
      toast.message("Please enter the monthly maintenance amount.");
      return;
    }
    if (petFriendly === "case_by_case" && !petCaseNotes.trim()) {
      toast.message("Please briefly describe the pet policy case.");
      return;
    }

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
      toast.message("We couldn’t save the location. Please try again.");
      return;
    }
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: locationJson.location.id,
        asking_rent: asking,
        bhk,
        carpet_area: carpet,
        furnishing,
        maintenance_status: maintenanceStatus,
        maintenance_amount:
          maintenanceStatus === "extra" ? maintenanceAmount : null,
        pet_friendly: petFriendly,
        pet_case_notes: petCaseNotes,
        photos,
      }),
    });
    if (!response.ok) {
      toast.message("We couldn’t create the listing. Please review and try again.");
      return;
    }
    toast.success("Listing is live for verified users.");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 ledger-card p-6">
      <h1 className="font-serif text-3xl text-navy">Post a rental listing</h1>
      <p className="text-sm text-muted-foreground">
        Advertise a vacant home for rent. This is for owners — renters should add
        a rental review for the home they currently live in instead.
      </p>
      <div className="space-y-2">
        <Label>City</Label>
        <select
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={city}
          onChange={(event) => {
            const next = event.target.value;
            setCity(next);
            const nextArea = areasFor(next)[0] ?? "";
            setArea(nextArea);
            setBuilding(buildingsForArea(nextArea)[0] ?? "");
          }}
        >
          {cities.map((item) => (
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
            min={1}
            className="h-11"
            value={asking}
            onChange={(event) => setAsking(readPositive(event.target.value, asking))}
          />
        </div>
        <div className="space-y-2">
          <Label>BHK</Label>
          <Input
            type="number"
            min={1}
            className="h-11"
            value={bhk}
            onChange={(event) => setBhk(readPositive(event.target.value, bhk))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Carpet area (sq. ft.)</Label>
        <Input
          type="number"
          min={1}
          className="h-11"
          value={carpet}
          onChange={(event) => setCarpet(readPositive(event.target.value, carpet))}
        />
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
        <Label>Maintenance</Label>
        <select
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={maintenanceStatus}
          onChange={(event) =>
            setMaintenanceStatus(event.target.value as "included" | "extra" | "none")
          }
        >
          <option value="included">Included</option>
          <option value="extra">Paid extra</option>
          <option value="none">None</option>
        </select>
      </div>
      {maintenanceStatus === "extra" ? (
        <div className="space-y-2">
          <Label>Monthly maintenance amount (₹)</Label>
          <Input
            type="number"
            min={1}
            className="h-11"
            value={maintenanceAmount}
            onChange={(event) =>
              setMaintenanceAmount(readPositive(event.target.value, maintenanceAmount))
            }
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Pet friendly</Label>
        <select
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          value={petFriendly}
          onChange={(event) =>
            setPetFriendly(event.target.value as "yes" | "no" | "case_by_case")
          }
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="case_by_case">Case by case</option>
        </select>
      </div>
      {petFriendly === "case_by_case" ? (
        <div className="space-y-2">
          <Label>What is the pet policy case?</Label>
          <Textarea
            value={petCaseNotes}
            onChange={(event) => setPetCaseNotes(event.target.value)}
            placeholder="e.g. small pets only, deposit required, society approval needed…"
          />
        </div>
      ) : null}
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
        Publish rental listing
      </Button>
    </form>
  );
}
