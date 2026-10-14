"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  buildingsForArea,
} from "@/lib/data/cities";
import { usePublicCatalog } from "@/lib/use-public-catalog";
import {
  firstZodMessage,
  isVaguePlaceName,
  onboardingSchema,
} from "@/lib/validations";
import type {
  FloorLevel,
  Furnishing,
  Parking,
  PowerBackup,
  Purpose,
  TotalUnits,
  UserRole,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const PURPOSE_BY_ROLE: Record<UserRole, Array<readonly [Purpose, string]>> = {
  owner: [
    ["list_property", "List or advertise a property for rent"],
    ["connect", "Connect with prospective renters"],
  ],
  renter: [
    ["find_rent", "Find a property to rent"],
    ["view_trends", "Compare neighbourhood rent trends after my review"],
  ],
  explorer: [["view_trends", "View city and locality trends"]],
};

const OWNER_FACILITIES = [
  "Lift",
  "Covered parking",
  "Power backup",
  "Gym",
  "Clubhouse",
  "Swimming pool",
  "Security",
  "Children play area",
  "Visitor parking",
] as const;

const ROLE_CARDS: Array<{
  value: UserRole;
  title: string;
  body: string;
}> = [
  {
    value: "owner",
    title: "Owner",
    body: "Advertise a vacant home with asking rent and property details.",
  },
  {
    value: "renter",
    title: "Renter",
    body: "Add a rental review for the home you currently rent — what you pay and how the society feels.",
  },
  {
    value: "explorer",
    title: "Explorer",
    body: "Browse the market and share what you notice nearby.",
  },
];

function PositiveInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="number"
      min={1}
      inputMode="numeric"
      className={cn("h-11", className)}
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

export function OnboardingWizard({ initialPhone = "" }: { initialPhone?: string }) {
  const router = useRouter();
  const { cities, areasFor } = usePublicCatalog();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [building, setBuilding] = useState("");
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [extraBuildings, setExtraBuildings] = useState<string[]>([]);

  const [role, setRole] = useState<UserRole | "">("");
  const [purpose, setPurpose] = useState<Purpose | "">("");
  const phone = initialPhone;

  const [askingRent, setAskingRent] = useState<number | "">("");
  const [ownerBhk, setOwnerBhk] = useState<number | "">("");
  const [ownerCarpet, setOwnerCarpet] = useState<number | "">("");
  const [ownerFurnishing, setOwnerFurnishing] = useState<Furnishing | "">("");
  const [maintenanceStatus, setMaintenanceStatus] = useState<
    "included" | "extra" | "none" | ""
  >("");
  const [ownerMaintenanceAmount, setOwnerMaintenanceAmount] = useState<number | "">("");
  const [petFriendly, setPetFriendly] = useState<"yes" | "no" | "case_by_case" | "">("");
  const [petCaseNotes, setPetCaseNotes] = useState("");
  const [buildingAge, setBuildingAge] = useState<number | "">("");
  const [floorNumber, setFloorNumber] = useState<number | "">("");
  const [facilities, setFacilities] = useState<string[]>([]);

  const [monthlyRent, setMonthlyRent] = useState<number | "">("");
  const [maintenance, setMaintenance] = useState<number | "">("");
  const [bhk, setBhk] = useState<number | "">("");
  const [carpet, setCarpet] = useState<number | "">("");
  const [floor, setFloor] = useState<FloorLevel | "">("");
  const [furnishing, setFurnishing] = useState<Furnishing | "">("");
  const [units, setUnits] = useState<TotalUnits | "">("");
  const [lift, setLift] = useState<"yes" | "no" | "">("");
  const [parking, setParking] = useState<Parking | "">("");
  const [backup, setBackup] = useState<PowerBackup | "">("");
  const [metroKm, setMetroKm] = useState<number | "">("");
  const [railwayKm, setRailwayKm] = useState<number | "">("");
  const [airportKm, setAirportKm] = useState<number | "">("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [problemsFaced, setProblemsFaced] = useState("");
  const [hurdles, setHurdles] = useState("");
  const [localPolitics, setLocalPolitics] = useState("");
  const [legalIssues, setLegalIssues] = useState("");

  const [neighborhoodFeel, setNeighborhoodFeel] = useState("");
  const [commuteNotes, setCommuteNotes] = useState("");
  const [amenitiesNearby, setAmenitiesNearby] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");

  const areaOptions = useMemo(() => {
    const base = areasFor(city);
    return Array.from(new Set([...base, ...extraAreas]));
  }, [city, extraAreas, areasFor]);

  const buildingOptions = useMemo(() => {
    const base = buildingsForArea(area);
    return Array.from(new Set([...base, ...extraBuildings]));
  }, [area, extraBuildings]);

  useEffect(() => {
    setExtraAreas([]);
    setExtraBuildings([]);
  }, [city]);

  useEffect(() => {
    setExtraBuildings([]);
  }, [area]);

  function rememberPlace(kind: "area" | "building", next: string) {
    if (kind === "area" && !areasFor(city).includes(next)) {
      setExtraAreas((current) => (current.includes(next) ? current : [...current, next]));
    }
    if (kind === "building" && !buildingsForArea(area).includes(next)) {
      setExtraBuildings((current) =>
        current.includes(next) ? current : [...current, next]
      );
    }
  }

  function validateStep0(force = false): boolean {
    if (city.trim().length < 2 || area.trim().length < 2 || building.trim().length < 2) {
      toast.message("Please enter city, area, and community to continue.");
      return false;
    }
    if (!force && (isVaguePlaceName(area) || isVaguePlaceName(building))) {
      setPendingConfirm(
        `Just to confirm — should we use “${building.trim()}” in ${area.trim()}, ${city.trim()}?`
      );
      return false;
    }
    setPendingConfirm(null);
    void fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: city.trim(),
        area: area.trim(),
        building_name: building.trim(),
      }),
    });
    return true;
  }

  function validateStep1(): boolean {
    if (!role) {
      toast.message("Please choose whether you are an Owner, Renter, or Explorer.");
      return false;
    }
    if (role !== "explorer" && !phone) {
      toast.message("Please sign in again with your mobile number to continue.");
      return false;
    }
    if (role === "owner") {
      if (!askingRent || !ownerBhk || !ownerCarpet || !ownerFurnishing || !maintenanceStatus || !petFriendly) {
        toast.message("Please fill in the owner property details to continue.");
        return false;
      }
      if (maintenanceStatus === "extra" && !ownerMaintenanceAmount) {
        toast.message("Please enter the monthly maintenance amount.");
        return false;
      }
      if (petFriendly === "case_by_case" && !petCaseNotes.trim()) {
        toast.message("Please briefly describe the pet policy for this home.");
        return false;
      }
    }
    if (role === "renter") {
      if (!monthlyRent || !bhk || !carpet || !floor || !furnishing || !units || !parking || !backup || !lift) {
        toast.message("Please complete the rent and property details to continue.");
        return false;
      }
      if (maintenance !== "" && Number(maintenance) < 0) {
        toast.message("Maintenance should be zero or a positive amount.");
        return false;
      }
    }
    if (role === "explorer") setPurpose("view_trends");
    if (role === "owner" && !purpose) setPurpose("list_property");
    if (role === "renter" && !purpose) setPurpose("find_rent");
    return true;
  }

  function next() {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((value) => Math.min(value + 1, 2));
  }

  function toggleFacility(name: string) {
    setFacilities((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  }

  async function submit() {
    if (!role) {
      toast.message("Please choose a role first.");
      return;
    }
    if (!purpose) {
      toast.message("Please select what you’d like to do next.");
      return;
    }
    if (!validateStep0(true) || !validateStep1()) return;

    const payload = {
      city: city.trim(),
      area: area.trim(),
      building_name: building.trim(),
      role,
      purpose: role === "explorer" ? "view_trends" : purpose,
      renter:
        role === "renter"
          ? {
              monthly_rent: Number(monthlyRent),
              maintenance: Number(maintenance || 0),
              bhk: Number(bhk),
              carpet_area: Number(carpet),
              floor_level: floor,
              furnishing,
              total_units: units,
              has_lift: lift === "yes",
              parking,
              power_backup: backup,
              metro_distance_km: metroKm === "" ? null : Number(metroKm),
              railway_distance_km: railwayKm === "" ? null : Number(railwayKm),
              airport_distance_km: airportKm === "" ? null : Number(airportKm),
              phone,
              problems_faced: problemsFaced,
              hurdles,
              local_politics: localPolitics,
              legal_issues: legalIssues,
            }
          : undefined,
      owner:
        role === "owner"
          ? {
              asking_rent: Number(askingRent),
              bhk: Number(ownerBhk),
              furnishing: ownerFurnishing,
              phone,
              carpet_area: Number(ownerCarpet),
              maintenance_status: maintenanceStatus || "extra",
              maintenance_amount:
                maintenanceStatus === "extra"
                  ? Number(ownerMaintenanceAmount)
                  : null,
              pet_friendly: petFriendly || "case_by_case",
              pet_case_notes: petCaseNotes,
              building_age_years:
                buildingAge === "" ? null : Number(buildingAge),
              floor_number: floorNumber === "" ? null : Number(floorNumber),
              facilities,
            }
          : undefined,
      explorer:
        role === "explorer"
          ? {
              neighborhood_feel: neighborhoodFeel,
              commute_notes: commuteNotes,
              amenities_nearby: amenitiesNearby,
              safety_notes: safetyNotes,
            }
          : undefined,
    };

    const parsed = onboardingSchema.safeParse(payload);
    if (!parsed.success) {
      toast.message(firstZodMessage(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.message(
          json.error ??
            "We couldn’t finish setup just now. Please review your details and try again."
        );
        return;
      }
      toast.success(
        "Thanks — your rental review is with our team for verification. Trust score stays below 100 until an admin approves it."
      );
      router.push(json.next ?? "/dashboard");
      router.refresh();
    } catch {
      toast.message("Something went wrong while saving. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
        Onboarding
      </p>
      <h1 className="mt-2 font-serif text-4xl text-navy">Pin yourself to a place.</h1>
      <ol className="mt-8 space-y-3">
        {(
          [
            "Location pin",
            role === "renter" ? "Rental review" : "Status & facts",
            "Purpose",
          ] as const
        ).map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              index === step
                ? "border-teal bg-accent text-navy"
                : index < step
                  ? "border-teal/30 text-teal-700"
                  : "border-dashed border-border text-muted-foreground"
            )}
          >
            <span className="mr-3 font-serif text-lg">0{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="mt-8 ledger-card p-6">
        {step === 0 ? (
          <div className="space-y-5">
            <Field label="City">
              <SearchableCombobox
                id="city"
                value={city}
                options={cities}
                placeholder="Search or select a city"
                allowCreate={false}
                onChange={(next) => {
                  setCity(next);
                  setArea("");
                  setBuilding("");
                  setPendingConfirm(null);
                }}
              />
            </Field>
            <Field label="Area / locality">
              <SearchableCombobox
                id="area"
                value={area}
                options={areaOptions}
                placeholder={city ? "Type or select an area" : "Pick a city first"}
                allowCreate
                onChange={(next) => {
                  setArea(next);
                  setBuilding("");
                  rememberPlace("area", next);
                  setPendingConfirm(null);
                }}
              />
            </Field>
            <Field label="Building / community / society / colony">
              <SearchableCombobox
                id="building"
                value={building}
                options={buildingOptions}
                placeholder={area ? "Type or select a community" : "Pick an area first"}
                allowCreate
                onChange={(next) => {
                  setBuilding(next);
                  rememberPlace("building", next);
                  setPendingConfirm(null);
                }}
              />
            </Field>
            {pendingConfirm ? (
              <div className="rounded-xl border border-teal/30 bg-accent/60 p-4 text-sm text-navy">
                <p>{pendingConfirm}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      if (validateStep0(true)) setStep(1);
                    }}
                  >
                    Yes, continue
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingConfirm(null)}
                  >
                    Edit details
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            {role !== "explorer" ? <AccuracyNote role={role} /> : null}

            <div className="space-y-2">
              <Label>I am a</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {ROLE_CARDS.map((card) => {
                  const selected = role === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => {
                        setRole(card.value);
                        setPurpose(
                          card.value === "owner"
                            ? "list_property"
                            : card.value === "renter"
                              ? "find_rent"
                              : "view_trends"
                        );
                      }}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition",
                        selected
                          ? "border-teal bg-accent shadow-stamp ring-2 ring-teal/30"
                          : "border-border hover:border-teal/40 hover:bg-secondary/40"
                      )}
                      aria-pressed={selected}
                    >
                      <p className="font-serif text-xl text-navy">{card.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {card.body}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {role && role !== "explorer" ? <PrivacyNote /> : null}

            {role === "owner" ? (
              <div className="space-y-4">
                <Field label="Asking rent (₹)">
                  <PositiveInput value={askingRent} onChange={setAskingRent} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="BHK">
                    <PositiveInput value={ownerBhk} onChange={setOwnerBhk} />
                  </Field>
                  <Field label="Carpet area (sq. ft.)">
                    <PositiveInput value={ownerCarpet} onChange={setOwnerCarpet} />
                  </Field>
                </div>
                <Choice
                  label="Furnishing"
                  value={ownerFurnishing}
                  onChange={setOwnerFurnishing}
                  options={[
                    ["unfurnished", "Unfurnished"],
                    ["semi", "Semi"],
                    ["fully", "Fully"],
                  ]}
                />
                <Choice
                  label="Maintenance"
                  value={maintenanceStatus}
                  onChange={setMaintenanceStatus}
                  options={[
                    ["included", "Included"],
                    ["extra", "Paid extra"],
                    ["none", "None"],
                  ]}
                />
                {maintenanceStatus === "extra" ? (
                  <Field label="Monthly maintenance amount (₹)">
                    <PositiveInput
                      value={ownerMaintenanceAmount}
                      onChange={setOwnerMaintenanceAmount}
                    />
                  </Field>
                ) : null}
                <Choice
                  label="Pet friendly"
                  value={petFriendly}
                  onChange={setPetFriendly}
                  options={[
                    ["yes", "Yes"],
                    ["no", "No"],
                    ["case_by_case", "Case by case"],
                  ]}
                />
                {petFriendly === "case_by_case" ? (
                  <Field label="What is the pet policy case?">
                    <Textarea
                      value={petCaseNotes}
                      onChange={(event) => setPetCaseNotes(event.target.value)}
                      placeholder="e.g. small pets only, deposit required, society approval needed…"
                      autoComplete="off"
                    />
                  </Field>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age of building (years)">
                    <Input
                      type="number"
                      min={0}
                      className="h-11"
                      value={buildingAge}
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === "") {
                          setBuildingAge("");
                          return;
                        }
                        const next = Number(raw);
                        if (!Number.isFinite(next) || next < 0) {
                          toast.message("Please enter zero or a positive number.");
                          return;
                        }
                        setBuildingAge(Math.floor(next));
                      }}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Floor number">
                    <Input
                      type="number"
                      min={0}
                      className="h-11"
                      value={floorNumber}
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === "") {
                          setFloorNumber("");
                          return;
                        }
                        const next = Number(raw);
                        if (!Number.isFinite(next) || next < 0) {
                          toast.message("Please enter zero or a positive number.");
                          return;
                        }
                        setFloorNumber(Math.floor(next));
                      }}
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <div className="space-y-2">
                  <Label>Facilities available</Label>
                  <div className="flex flex-wrap gap-2">
                    {OWNER_FACILITIES.map((name) => {
                      const on = facilities.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleFacility(name)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs",
                            on
                              ? "border-teal bg-accent text-navy"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {role === "renter" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-2xl text-navy">
                    Add a rental review
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell us about the home you currently rent — rent, size, and
                    how living there feels.
                  </p>
                </div>
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
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === "") {
                          setMaintenance("");
                          return;
                        }
                        const next = Number(raw);
                        if (!Number.isFinite(next) || next < 0) {
                          toast.message("Maintenance should be zero or a positive amount.");
                          return;
                        }
                        setMaintenance(Math.floor(next));
                      }}
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field label="Carpet area (sq. ft.)">
                  <PositiveInput value={carpet} onChange={setCarpet} />
                </Field>
                <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-xs font-medium text-navy">
                    Nearby distances (optional · KM only if provided)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Metro station (KM)">
                      <PositiveInput value={metroKm} onChange={setMetroKm} placeholder="Optional" />
                    </Field>
                    <Field label="Railway station (KM)">
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
                    <p className="text-sm font-medium text-navy">Complaints & lived-in notes</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      These show up on building search for others considering this
                      society.
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
                      placeholder="Association friction, informal rules, gate politics…"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Legal cases or litigation">
                    <Textarea
                      value={legalIssues}
                      onChange={(event) => setLegalIssues(event.target.value)}
                      placeholder="Known cases, RERA issues, disputes (if any)…"
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
              </div>
            ) : null}

            {role === "explorer" ? (
              <div className="space-y-4">
                <Field label="Neighborhood feel">
                  <Textarea
                    value={neighborhoodFeel}
                    onChange={(event) => setNeighborhoodFeel(event.target.value)}
                    placeholder="Quiet, lively, family-friendly, congested…"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Commute notes">
                  <Textarea
                    value={commuteNotes}
                    onChange={(event) => setCommuteNotes(event.target.value)}
                    placeholder="Metro access, traffic, office reach time…"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Amenities nearby">
                  <Textarea
                    value={amenitiesNearby}
                    onChange={(event) => setAmenitiesNearby(event.target.value)}
                    placeholder="Markets, parks, hospitals, schools…"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Safety notes">
                  <Textarea
                    value={safetyNotes}
                    onChange={(event) => setSafetyNotes(event.target.value)}
                    placeholder="Lighting, night movement, security presence…"
                    autoComplete="off"
                  />
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {role === "owner"
                ? "Choose what you want to do as an owner."
                : role === "renter"
                  ? "Choose what you want to do as a renter."
                  : "Explorers can browse city-level trends."}
            </p>
            {(role ? PURPOSE_BY_ROLE[role] : []).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPurpose(value)}
                className={cn(
                  "w-full rounded-xl border px-4 py-4 text-left",
                  purpose === value
                    ? "border-teal bg-accent ring-2 ring-teal/30"
                    : "border-border hover:bg-secondary/50"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
          {step < 2 ? (
            <Button className="rounded-full px-5" onClick={next}>
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              className="rounded-full px-5"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Continue to NewNagarik"}
            </Button>
          )}
        </div>
      </div>
    </div>
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

function AccuracyNote({ role }: { role: UserRole | "" }) {
  if (role === "renter") {
    return (
      <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
        You’re adding a rental review for the home you currently rent. Please share
        exact agreement amounts — accurate reviews help others decide with
        confidence.
      </p>
    );
  }
  return (
    <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
      Please share exact agreement amounts. Accurate details help keep NewNagarik
      useful for everyone.
    </p>
  );
}

function PrivacyNote() {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-accent/70 px-3 py-2 text-xs text-teal-700">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
      Your privacy is our top priority. Contact details stay protected and are never
      shown publicly.
    </p>
  );
}
