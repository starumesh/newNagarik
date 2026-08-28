"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CITIES,
  areasForCity,
  buildingsForArea,
} from "@/lib/data/cities";
import { onboardingSchema } from "@/lib/validations";
import type { FloorLevel, Furnishing, Parking, PowerBackup, Purpose, TotalUnits, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Location pin", "Status & facts", "Purpose"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [city, setCity] = useState<(typeof CITIES)[number]>("Bengaluru");
  const [area, setArea] = useState("Whitefield");
  const [building, setBuilding] = useState("Prestige Lakeside Habitat");
  const [role, setRole] = useState<UserRole>("renter");
  const [purpose, setPurpose] = useState<Purpose>("view_trends");
  const [askingRent, setAskingRent] = useState(45000);
  const [ownerBhk, setOwnerBhk] = useState(2);
  const [ownerFurnishing, setOwnerFurnishing] = useState<Furnishing>("semi");
  const [phone, setPhone] = useState("");
  const [monthlyRent, setMonthlyRent] = useState(32000);
  const [maintenance, setMaintenance] = useState(3500);
  const [bhk, setBhk] = useState(2);
  const [carpet, setCarpet] = useState(1100);
  const [floor, setFloor] = useState<FloorLevel>("mid");
  const [furnishing, setFurnishing] = useState<Furnishing>("semi");
  const [units, setUnits] = useState<TotalUnits>("31-100");
  const [lift, setLift] = useState(true);
  const [parking, setParking] = useState<Parking>("yes");
  const [backup, setBackup] = useState<PowerBackup>("partial");
  const [metro, setMetro] = useState(2);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const areas = areasForCity(city);
  const buildings = useMemo(() => buildingsForArea(area), [area]);

  function next() {
    if (step === 0 && (!city || !area || building.trim().length < 2)) {
      toast.error("Pin city, area, and building before continuing.");
      return;
    }
    if (step === 1 && role !== "explorer" && phone.replace(/\D/g, "").length < 10) {
      toast.error("A phone number is required for identity fingerprinting.");
      return;
    }
    if (step === 1 && role === "explorer") {
      setPurpose("view_trends");
    }
    setStep((value) => Math.min(value + 1, 2));
  }

  async function submit() {
    const payload = {
      city,
      area,
      building_name: building.trim(),
      role,
      purpose: role === "explorer" ? "view_trends" : purpose,
      renter:
        role === "renter"
          ? {
              monthly_rent: monthlyRent,
              maintenance,
              bhk,
              carpet_area: carpet,
              floor_level: floor,
              furnishing,
              total_units: units,
              has_lift: lift,
              parking,
              power_backup: backup,
              metro_distance: metro,
              phone,
            }
          : undefined,
      owner:
        role === "owner"
          ? {
              asking_rent: askingRent,
              bhk: ownerBhk,
              furnishing: ownerFurnishing,
              phone,
            }
          : undefined,
    };

    const parsed = onboardingSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Please complete the required fields.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const json = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      toast.error(json.error ?? "Could not finish onboarding.");
      return;
    }
    toast.success(
      json.verification === "under_review"
        ? "Submitted. An admin will review before it goes public."
        : "Welcome to the ledger."
    );
    router.push(json.next ?? "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-24">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
        Onboarding
      </p>
      <h1 className="mt-2 font-serif text-4xl text-navy">Pin yourself to a place.</h1>
      <ol className="mt-8 space-y-3">
        {STEPS.map((label, index) => (
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
              <select
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                value={city}
                onChange={(event) => {
                  const nextCity = event.target.value as (typeof CITIES)[number];
                  setCity(nextCity);
                  const nextAreas = areasForCity(nextCity);
                  setArea(nextAreas[0] ?? "");
                  setBuilding(buildingsForArea(nextAreas[0] ?? "")[0] ?? "");
                }}
              >
                {CITIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Area / locality">
              <Input
                list="areas"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="h-11"
              />
              <datalist id="areas">
                {areas.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
            <Field label="Building / community / society / colony">
              <Input
                list="buildings"
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
                className="h-11"
              />
              <datalist id="buildings">
                {buildings.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Type a new name to add it to the ledger.
              </p>
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <Warning />
            <Tabs value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <TabsList className="h-12 w-full rounded-full">
                <TabsTrigger value="owner" className="rounded-full">
                  Owner
                </TabsTrigger>
                <TabsTrigger value="renter" className="rounded-full">
                  Renter
                </TabsTrigger>
                <TabsTrigger value="explorer" className="rounded-full">
                  Explorer
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {role !== "explorer" ? (
              <Field label="Phone (hashed, never published)">
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-11"
                  placeholder="9876543210"
                />
              </Field>
            ) : null}

            {role === "owner" ? (
              <div className="space-y-4">
                <Field
                  label="Asking rent (₹)"
                  hint="Enter the exact amount you are asking."
                >
                  <Input
                    type="number"
                    className="h-11"
                    value={askingRent}
                    onChange={(event) => setAskingRent(Number(event.target.value))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="BHK">
                    <Input
                      type="number"
                      className="h-11"
                      value={ownerBhk}
                      onChange={(event) => setOwnerBhk(Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Furnishing">
                    <select
                      className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                      value={ownerFurnishing}
                      onChange={(event) =>
                        setOwnerFurnishing(event.target.value as Furnishing)
                      }
                    >
                      <option value="unfurnished">Unfurnished</option>
                      <option value="semi">Semi</option>
                      <option value="fully">Fully</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}

            {role === "renter" ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Current rent (₹)">
                    <Input
                      type="number"
                      className="h-11"
                      value={monthlyRent}
                      onChange={(event) => setMonthlyRent(Number(event.target.value))}
                    />
                  </Field>
                  <Field label="Maintenance (₹)">
                    <Input
                      type="number"
                      className="h-11"
                      value={maintenance}
                      onChange={(event) => setMaintenance(Number(event.target.value))}
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-teal-700"
                  onClick={() => setDetailsOpen((value) => !value)}
                >
                  {detailsOpen ? "Hide" : "Show"} detailed property profile
                  (mandatory)
                </button>
                {detailsOpen ? (
                  <div className="space-y-5 rounded-xl bg-secondary/50 p-4">
                    <Field label={`Carpet area · ${carpet} sq. ft.`}>
                      <Slider
                        min={100}
                        max={4000}
                        step={10}
                        value={[carpet]}
                        onValueChange={(value) =>
                          setCarpet(Array.isArray(value) ? (value[0] ?? carpet) : value)
                        }
                      />
                    </Field>
                    <Field label="BHK">
                      <Input
                        type="number"
                        className="h-11"
                        value={bhk}
                        onChange={(event) => setBhk(Number(event.target.value))}
                      />
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
                    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <Label>24/7 lift?</Label>
                      <Switch checked={lift} onCheckedChange={setLift} />
                    </div>
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
                    <Field label={`Distance to metro / railway · ${metro} km`}>
                      <Slider
                        min={0}
                        max={20}
                        step={1}
                        value={[metro]}
                        onValueChange={(value) =>
                          setMetro(Array.isArray(value) ? (value[0] ?? metro) : value)
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
            ) : null}

            {role === "explorer" ? (
              <div className="rounded-xl border border-dashed border-brass/40 bg-brass/10 p-4 text-sm text-navy">
                You will only see macro market trends until you contribute data.
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            {(role === "explorer"
              ? ([["view_trends", "View trends"]] as const)
              : ([
                  ["view_trends", "View trends"],
                  ["list_property", "List my property"],
                  ["connect", "Connect with owners / tenants"],
                ] as const)
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPurpose(value)}
                className={cn(
                  "w-full rounded-xl border px-4 py-4 text-left",
                  purpose === value
                    ? "border-teal bg-accent"
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
              {submitting ? "Submitting…" : "Enter RentSahih"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {hint ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
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
  value: T;
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
                ? "border-teal bg-accent text-navy"
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

function Warning() {
  return (
    <p className="flex gap-2 rounded-lg bg-brass/10 px-3 py-2 text-xs text-brass">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      Enter exact agreement amounts. False entries permanently restrict your
      account to Explorer mode.
    </p>
  );
}
