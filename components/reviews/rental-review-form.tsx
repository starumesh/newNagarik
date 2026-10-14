"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  buildingsForArea,
} from "@/lib/data/cities";
import { usePublicCatalog } from "@/lib/use-public-catalog";
import { firstZodMessage, renterDetailsSchema } from "@/lib/validations";
import type {
  FloorLevel,
  Furnishing,
  Parking,
  PowerBackup,
  TotalUnits,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type RentalReviewInitial = {
  city: string;
  area: string;
  building_name: string;
  monthly_rent: number;
  maintenance: number;
  carpet_area: number;
  bhk: number;
  floor_level: FloorLevel;
  furnishing: Furnishing;
  total_units: TotalUnits;
  has_lift: boolean;
  parking: Parking;
  power_backup: PowerBackup;
  metro_distance_km?: number | null;
  railway_distance_km?: number | null;
  airport_distance_km?: number | null;
  problems_faced?: string;
  hurdles?: string;
  local_politics?: string;
  legal_issues?: string;
};

function PositiveInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      min={1}
      inputMode="numeric"
      className="h-11"
      value={value}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const next = Number(raw);
        if (!Number.isFinite(next) || next <= 0) {
          toast.message("Please enter a positive number.");
          return;
        }
        onChange(Math.floor(next));
      }}
    />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | "";
  onChange: (value: T) => void;
  options: ReadonlyArray<readonly [T, string]>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs",
              value === option
                ? "border-teal bg-accent text-navy ring-2 ring-teal/25"
                : "border-border text-muted-foreground"
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RentalReviewForm({
  mode,
  entryId,
  phone,
  initial,
}: {
  mode: "create" | "edit";
  entryId?: string;
  phone: string;
  initial?: RentalReviewInitial;
}) {
  const router = useRouter();
  const { cities, areasFor } = usePublicCatalog();
  const [submitting, setSubmitting] = useState(false);

  const [city, setCity] = useState(initial?.city ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [building, setBuilding] = useState(initial?.building_name ?? "");
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [extraBuildings, setExtraBuildings] = useState<string[]>([]);

  const [monthlyRent, setMonthlyRent] = useState<number | "">(
    initial?.monthly_rent ?? ""
  );
  const [maintenance, setMaintenance] = useState<number | "">(
    initial?.maintenance ?? ""
  );
  const [carpet, setCarpet] = useState<number | "">(initial?.carpet_area ?? "");
  const [bhk, setBhk] = useState<number | "">(initial?.bhk ?? "");
  const [floor, setFloor] = useState<FloorLevel | "">(
    initial?.floor_level ?? ""
  );
  const [furnishing, setFurnishing] = useState<Furnishing | "">(
    initial?.furnishing ?? ""
  );
  const [units, setUnits] = useState<TotalUnits | "">(
    initial?.total_units ?? ""
  );
  const [lift, setLift] = useState<"yes" | "no" | "">(
    initial ? (initial.has_lift ? "yes" : "no") : ""
  );
  const [parking, setParking] = useState<Parking | "">(initial?.parking ?? "");
  const [backup, setBackup] = useState<PowerBackup | "">(
    initial?.power_backup ?? ""
  );
  const [metroKm, setMetroKm] = useState<number | "">(
    initial?.metro_distance_km ?? ""
  );
  const [railwayKm, setRailwayKm] = useState<number | "">(
    initial?.railway_distance_km ?? ""
  );
  const [airportKm, setAirportKm] = useState<number | "">(
    initial?.airport_distance_km ?? ""
  );
  const [problemsFaced, setProblemsFaced] = useState(
    initial?.problems_faced ?? ""
  );
  const [hurdles, setHurdles] = useState(initial?.hurdles ?? "");
  const [localPolitics, setLocalPolitics] = useState(
    initial?.local_politics ?? ""
  );
  const [legalIssues, setLegalIssues] = useState(initial?.legal_issues ?? "");
  const [detailsOpen, setDetailsOpen] = useState(true);

  const areaOptions = useMemo(() => {
    const base = areasFor(city);
    return Array.from(new Set([...base, ...extraAreas]));
  }, [city, extraAreas, areasFor]);

  const buildingOptions = useMemo(() => {
    const base = buildingsForArea(area);
    return Array.from(new Set([...base, ...extraBuildings]));
  }, [area, extraBuildings]);

  function rememberPlace(kind: "area" | "building", next: string) {
    if (kind === "area" && !areasFor(city).includes(next)) {
      setExtraAreas((current) =>
        current.includes(next) ? current : [...current, next]
      );
    }
    if (kind === "building" && !buildingsForArea(area).includes(next)) {
      setExtraBuildings((current) =>
        current.includes(next) ? current : [...current, next]
      );
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!city.trim() || !area.trim() || !building.trim()) {
      toast.message("Please enter city, area, and building.");
      return;
    }
    if (!phone) {
      toast.message("Please sign in again so we can verify your mobile.");
      return;
    }
    if (!lift || !floor || !furnishing || !units || !parking || !backup || bhk === "") {
      toast.message("Please complete the detailed property profile (BHK, floor, etc.).");
      setDetailsOpen(true);
      return;
    }

    const details = renterDetailsSchema.safeParse({
      monthly_rent: monthlyRent === "" ? undefined : monthlyRent,
      maintenance: maintenance === "" ? undefined : maintenance,
      carpet_area: carpet === "" ? undefined : carpet,
      bhk,
      floor_level: floor,
      furnishing,
      total_units: units,
      has_lift: lift === "yes",
      parking,
      power_backup: backup,
      metro_distance_km: metroKm === "" ? null : metroKm,
      railway_distance_km: railwayKm === "" ? null : railwayKm,
      airport_distance_km: airportKm === "" ? null : airportKm,
      phone,
      problems_faced: problemsFaced,
      hurdles,
      local_politics: localPolitics,
      legal_issues: legalIssues,
    });

    if (!details.success) {
      toast.message(firstZodMessage(details.error));
      return;
    }

    setSubmitting(true);
    const body = {
      city: city.trim(),
      area: area.trim(),
      building_name: building.trim(),
      ...details.data,
    };

    const response =
      mode === "edit" && entryId
        ? await fetch(`/api/rent-entries/${entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/submit-rent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

    const json = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      toast.message(json.error ?? "Could not save your rental review.");
      return;
    }

    toast.success(
      mode === "edit"
        ? "Review updated — it’ll be checked again before showing as verified."
        : "Rental review submitted for verification."
    );
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Rental review
        </p>
        <h1 className="mt-2 font-serif text-4xl text-navy">
          {mode === "edit" ? "Edit your rental review" : "Add a rental review"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share what you pay and how living there feels. Edits go back for a
          quick check before the Verified mark returns.
        </p>
      </div>

      <div className="ledger-card space-y-5 p-6">
        <Field label="City">
          <SearchableCombobox
            id="review-city"
            value={city}
            options={cities}
            placeholder="Search or select a city"
            allowCreate={false}
            onChange={(next) => {
              setCity(next);
              setArea("");
              setBuilding("");
              setExtraAreas([]);
              setExtraBuildings([]);
            }}
          />
        </Field>
        <Field label="Area / locality">
          <SearchableCombobox
            id="review-area"
            value={area}
            options={areaOptions}
            placeholder={city ? "Type or select an area" : "Pick a city first"}
            allowCreate
            onChange={(next) => {
              setArea(next);
              setBuilding("");
              rememberPlace("area", next);
              setExtraBuildings([]);
            }}
          />
        </Field>
        <Field label="Building / community / society">
          <SearchableCombobox
            id="review-building"
            value={building}
            options={buildingOptions}
            placeholder={area ? "Type or select a community" : "Pick an area first"}
            allowCreate
            onChange={(next) => {
              setBuilding(next);
              rememberPlace("building", next);
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Current rent (₹)">
            <PositiveInput value={monthlyRent} onChange={setMonthlyRent} />
          </Field>
          <Field label="Maintenance (₹)">
            <Input
              type="number"
              min={0}
              className="h-11"
              value={maintenance}
              autoComplete="off"
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "") {
                  setMaintenance("");
                  return;
                }
                const next = Number(raw);
                if (!Number.isFinite(next) || next < 0) {
                  toast.message(
                    "Maintenance should be zero or a positive amount."
                  );
                  return;
                }
                setMaintenance(Math.floor(next));
              }}
            />
          </Field>
        </div>
        <Field label="Carpet area (sq. ft.)">
          <PositiveInput value={carpet} onChange={setCarpet} />
        </Field>

        <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
          <p className="text-xs font-medium text-navy">
            Nearby distances (optional · KM)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Metro (KM)">
              <PositiveInput
                value={metroKm}
                onChange={setMetroKm}
                placeholder="Optional"
              />
            </Field>
            <Field label="Railway (KM)">
              <PositiveInput
                value={railwayKm}
                onChange={setRailwayKm}
                placeholder="Optional"
              />
            </Field>
            <Field label="Airport (KM)">
              <PositiveInput
                value={airportKm}
                onChange={setAirportKm}
                placeholder="Optional"
              />
            </Field>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-teal/25 bg-accent/40 p-4">
          <div>
            <p className="text-sm font-medium text-navy">
              Complaints & lived-in notes
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Problems, hurdles, and society notes help others decide.
            </p>
          </div>
          <Field label="Complaints / problems faced">
            <Textarea
              value={problemsFaced}
              onChange={(event) => setProblemsFaced(event.target.value)}
              placeholder="Water, noise, parking, maintenance delays…"
              autoComplete="off"
            />
          </Field>
          <Field label="Hurdles encountered">
            <Textarea
              value={hurdles}
              onChange={(event) => setHurdles(event.target.value)}
              placeholder="Broker issues, deposit disputes, move-in delays…"
              autoComplete="off"
            />
          </Field>
          <Field label="Local politics / society dynamics">
            <Textarea
              value={localPolitics}
              onChange={(event) => setLocalPolitics(event.target.value)}
              placeholder="Association friction, informal rules…"
              autoComplete="off"
            />
          </Field>
          <Field label="Legal cases or litigation">
            <Textarea
              value={legalIssues}
              onChange={(event) => setLegalIssues(event.target.value)}
              placeholder="Known cases, RERA issues (if any)…"
              autoComplete="off"
            />
          </Field>
        </div>

        <button
          type="button"
          className="text-sm font-medium text-teal-700"
          onClick={() => setDetailsOpen((value) => !value)}
        >
          {detailsOpen ? "Hide" : "Show"} detailed property profile
        </button>
        {detailsOpen ? (
          <div className="space-y-5 rounded-xl bg-secondary/50 p-4">
            <Field label="BHK">
              <PositiveInput value={bhk} onChange={setBhk} />
            </Field>
            <Choice
              label="Floor level"
              value={floor}
              onChange={setFloor}
              options={[
                ["ground", "Ground"],
                ["low", "Low 1–3"],
                ["mid", "Mid 4–8"],
                ["high", "High 9+"],
              ]}
            />
            <Choice
              label="Furnishing"
              value={furnishing}
              onChange={setFurnishing}
              options={[
                ["unfurnished", "Unfurnished"],
                ["semi", "Semi"],
                ["fully", "Fully"],
              ]}
            />
            <Choice
              label="Total building units"
              value={units}
              onChange={setUnits}
              options={[
                ["<10", "<10"],
                ["11-30", "11–30"],
                ["31-100", "31–100"],
                ["100+", "100+"],
              ]}
            />
            <Choice
              label="24/7 lift?"
              value={lift}
              onChange={setLift}
              options={[
                ["yes", "Yes"],
                ["no", "No"],
              ]}
            />
            <Choice
              label="Covered parking"
              value={parking}
              onChange={setParking}
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["paid", "Paid extra"],
              ]}
            />
            <Choice
              label="Power backup"
              value={backup}
              onChange={setBackup}
              options={[
                ["yes", "Yes"],
                ["no", "No"],
                ["partial", "Partial"],
              ]}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            className="rounded-full px-6"
            disabled={submitting}
          >
            {submitting
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Submit rental review"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
