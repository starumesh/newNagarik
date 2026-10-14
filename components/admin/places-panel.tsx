"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogArea, CatalogBuilding, CatalogCity } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-9 border-white/15 bg-navy-950 text-cream placeholder:text-slate-500";

export function PlacesPanel() {
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [areas, setAreas] = useState<CatalogArea[]>([]);
  const [buildings, setBuildings] = useState<CatalogBuilding[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [cityName, setCityName] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaKind, setAreaKind] = useState<CatalogArea["kind"]>("area");
  const [buildingName, setBuildingName] = useState("");
  const [buildingKind, setBuildingKind] = useState<CatalogBuilding["kind"]>("building");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch("/api/admin/catalog");
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not load catalog.");
      setLoading(false);
      return;
    }
    setNotice(json.missingSchema ? json.error : null);
    setCities(json.cities ?? []);
    setAreas(json.areas ?? []);
    setBuildings(json.buildings ?? []);
    setSelectedCity((current) => current || json.cities?.[0]?.name || "");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const cityAreas = useMemo(
    () => areas.filter((row) => row.city === selectedCity),
    [areas, selectedCity]
  );
  const areaBuildings = useMemo(
    () =>
      buildings.filter(
        (row) =>
          row.city === selectedCity &&
          (!selectedArea || row.area === selectedArea)
      ),
    [buildings, selectedCity, selectedArea]
  );

  async function act(body: Record<string, unknown>, okMessage: string) {
    const response = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Action failed.");
      return;
    }
    toast.success(okMessage);
    await load();
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <p className="rounded-xl border border-brass/30 bg-brass/10 px-3 py-2 text-sm text-brass">
          {notice}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Loading catalog…</p> : null}
      <div className="grid gap-4 xl:grid-cols-3">
        <CatalogColumn title="Cities" hint="Enable, disable, or add a city.">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void act(
                { action: "create", target: "city", name: cityName },
                "City added."
              ).then(() => setCityName(""));
            }}
          >
            <Input
              className={fieldClass}
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="New city"
            />
            <Button className="rounded-full bg-brass text-navy hover:bg-brass/90">
              Add
            </Button>
          </form>
          <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
            {cities.map((city) => (
              <Row
                key={city.id ?? city.name}
                active={selectedCity === city.name}
                enabled={city.is_enabled}
                title={city.name}
                onSelect={() => {
                  setSelectedCity(city.name);
                  setSelectedArea("");
                }}
                onToggle={() =>
                  void act(
                    {
                      action: "toggle",
                      target: "city",
                      id: city.id,
                      name: city.name,
                      is_enabled: !city.is_enabled,
                    },
                    city.is_enabled ? "City disabled." : "City enabled."
                  )
                }
                onDelete={
                  city.id
                    ? () =>
                        void act(
                          { action: "delete", target: "city", id: city.id },
                          "City removed."
                        )
                    : undefined
                }
              />
            ))}
          </div>
        </CatalogColumn>

        <CatalogColumn
          title="Areas / societies / communities"
          hint={selectedCity ? `Inside ${selectedCity}` : "Pick a city first."}
        >
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void act(
                {
                  action: "create",
                  target: "area",
                  city: selectedCity,
                  name: areaName,
                  kind: areaKind,
                },
                "Place added."
              ).then(() => setAreaName(""));
            }}
          >
            <div className="flex gap-2">
              <Input
                className={fieldClass}
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Whitefield, HSR…"
                disabled={!selectedCity}
              />
              <Button
                className="rounded-full bg-brass text-navy hover:bg-brass/90"
                disabled={!selectedCity}
              >
                Add
              </Button>
            </div>
            <select
              className="h-9 w-full rounded-lg border border-white/15 bg-navy-950 px-2 text-sm text-cream"
              value={areaKind}
              onChange={(e) => setAreaKind(e.target.value as CatalogArea["kind"])}
            >
              <option value="area">Area</option>
              <option value="society">Society</option>
              <option value="community">Community</option>
            </select>
          </form>
          <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
            {cityAreas.map((area) => (
              <Row
                key={area.id ?? `${area.city}-${area.name}`}
                active={selectedArea === area.name}
                enabled={area.is_enabled}
                title={area.name}
                meta={area.kind}
                onSelect={() => setSelectedArea(area.name)}
                onToggle={() =>
                  void act(
                    {
                      action: "toggle",
                      target: "area",
                      id: area.id,
                      is_enabled: !area.is_enabled,
                    },
                    area.is_enabled ? "Disabled." : "Enabled."
                  )
                }
                onDelete={
                  area.id
                    ? () =>
                        void act(
                          { action: "delete", target: "area", id: area.id },
                          "Removed."
                        )
                    : undefined
                }
              />
            ))}
          </div>
        </CatalogColumn>

        <CatalogColumn
          title="Buildings"
          hint={
            selectedArea
              ? `${selectedArea}, ${selectedCity}`
              : selectedCity
                ? `All buildings in ${selectedCity}`
                : "Pick a city first."
          }
        >
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void act(
                {
                  action: "create",
                  target: "building",
                  city: selectedCity,
                  area: selectedArea || areaName || selectedCity,
                  name: buildingName,
                  kind: buildingKind,
                },
                "Building added."
              ).then(() => setBuildingName(""));
            }}
          >
            <div className="flex gap-2">
              <Input
                className={fieldClass}
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="Prestige Lakeside Habitat"
                disabled={!selectedCity}
              />
              <Button
                className="rounded-full bg-brass text-navy hover:bg-brass/90"
                disabled={!selectedCity}
              >
                Add
              </Button>
            </div>
            <select
              className="h-9 w-full rounded-lg border border-white/15 bg-navy-950 px-2 text-sm text-cream"
              value={buildingKind}
              onChange={(e) =>
                setBuildingKind(e.target.value as CatalogBuilding["kind"])
              }
            >
              <option value="building">Building</option>
              <option value="society">Society</option>
              <option value="community">Community</option>
            </select>
          </form>
          <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto">
            {areaBuildings.map((building) => (
              <Row
                key={building.id}
                enabled={building.is_enabled}
                title={building.building_name}
                meta={`${building.area} · ${building.kind}`}
                onToggle={() =>
                  void act(
                    {
                      action: "toggle",
                      target: "building",
                      id: building.id,
                      is_enabled: !building.is_enabled,
                    },
                    building.is_enabled ? "Hidden from search." : "Visible in search."
                  )
                }
                onDelete={() =>
                  void act(
                    { action: "delete", target: "building", id: building.id },
                    "Building removed."
                  )
                }
              />
            ))}
          </div>
        </CatalogColumn>
      </div>
    </div>
  );
}

function CatalogColumn({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#121a2a] p-4">
      <h2 className="font-serif text-2xl text-cream">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({
  title,
  meta,
  enabled,
  active,
  onSelect,
  onToggle,
  onDelete,
}: {
  title: string;
  meta?: string;
  enabled: boolean;
  active?: boolean;
  onSelect?: () => void;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2",
        active ? "border-brass/60 bg-brass/10" : "border-white/10"
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
      >
        <p className={cn("truncate text-sm", enabled ? "text-cream" : "text-slate-500")}>
          {title}
        </p>
        {meta ? <p className="text-[11px] text-slate-500">{meta}</p> : null}
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="text-[11px] font-semibold uppercase tracking-wide text-brass"
      >
        {enabled ? "On" : "Off"}
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-[11px] text-red-300"
        >
          Del
        </button>
      ) : null}
    </div>
  );
}
